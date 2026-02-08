import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { Server as SocketIOServer } from 'socket.io';

const router: Router = Router();

// GET /api/client/session - Validate session token and get table info
router.get('/session', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.query;

        if (!token) {
            throw new ApiError('Session token required', 400, 'TOKEN_REQUIRED');
        }

        // Optimized: Single query with all needed data
        const result = await query(`
            SELECT 
                ts.id as session_id,
                ts.session_token,
                ts.started_at,
                ts.customer_count,
                t.id as table_id,
                t.number as table_number,
                t.name as table_name,
                o.id as order_id,
                o.subtotal,
                o.total
            FROM table_sessions ts
            JOIN tables t ON ts.table_id = t.id
            LEFT JOIN orders o ON ts.id = o.table_session_id AND o.status IN ('open', 'pending_payment')
            WHERE ts.session_token = $1 AND ts.ended_at IS NULL
        `, [token]);

        if (result.rows.length === 0) {
            throw new ApiError('Invalid or expired session', 401, 'INVALID_SESSION');
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
});

// Simple in-memory cache for menu (TTL 5 minutes)
let menuCache: { data: any; timestamp: number } | null = null;
const MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET /api/client/menu - Get menu (categories + products) with caching
router.get('/menu', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        // Check cache
        if (menuCache && (Date.now() - menuCache.timestamp) < MENU_CACHE_TTL) {
            console.log('[Menu Cache] HIT - serving from cache');
            return res.json({
                success: true,
                data: menuCache.data,
                cached: true
            });
        }

        console.log('[Menu Cache] MISS - fetching from DB');

        // Parallel queries for categories and products
        const [categoriesResult, productsResult] = await Promise.all([
            query(`SELECT id, name_vi, name_ja, name_en, name_translations, icon, sort_order FROM categories WHERE is_active = true ORDER BY sort_order ASC`),
            query(`SELECT id, category_id, name_vi, name_ja, name_en, name_translations, description_translations, price, image_url, sort_order FROM products WHERE is_available = true ORDER BY sort_order ASC`),
        ]);

        const data = {
            categories: categoriesResult.rows,
            products: productsResult.rows,
        };

        // Update cache
        menuCache = { data, timestamp: Date.now() };

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
});

// Invalidate menu cache (called when admin updates menu)
export const invalidateMenuCache = () => {
    menuCache = null;
    console.log('[Menu Cache] Invalidated');
};

// GET /api/client/order - Get current order for session (OPTIMIZED: single query)
router.get('/order', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.query;

        if (!token) {
            throw new ApiError('Session token required', 400, 'TOKEN_REQUIRED');
        }

        // OPTIMIZED: Single query with JOIN instead of 3 separate queries
        const result = await query(`
            SELECT 
                o.id as order_id,
                o.order_number,
                o.table_id,
                o.table_session_id,
                o.status as order_status,
                o.subtotal,
                o.discount_amount,
                o.discount_reason,
                o.total,
                o.created_at as order_created_at,
                oi.id as item_id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                oi.note,
                oi.kitchen_status,
                oi.display_in_kitchen,
                oi.created_at as item_created_at,
                p.name_vi as product_name_vi,
                p.name_ja as product_name_ja,
                p.name_en as product_name_en,
                p.image_url
            FROM table_sessions ts
            LEFT JOIN orders o ON ts.id = o.table_session_id AND o.status IN ('open', 'pending_payment')
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE ts.session_token = $1 AND ts.ended_at IS NULL
            ORDER BY oi.created_at ASC
        `, [token]);

        if (result.rows.length === 0) {
            throw new ApiError('Invalid session', 401, 'INVALID_SESSION');
        }

        // If no order yet (only session exists)
        if (!result.rows[0].order_id) {
            return res.json({
                success: true,
                data: { order: null, items: [] },
            });
        }

        // Transform flat result into order + items structure
        const firstRow = result.rows[0];
        const order = {
            id: firstRow.order_id,
            order_number: firstRow.order_number,
            table_id: firstRow.table_id,
            table_session_id: firstRow.table_session_id,
            status: firstRow.order_status,
            subtotal: firstRow.subtotal,
            discount_amount: firstRow.discount_amount,
            discount_reason: firstRow.discount_reason,
            total: firstRow.total,
            created_at: firstRow.order_created_at,
        };

        // Extract items (filter out null items if order has no items yet)
        const items = result.rows
            .filter(row => row.item_id !== null)
            .map(row => ({
                id: row.item_id,
                order_id: row.order_id,
                product_id: row.product_id,
                quantity: row.quantity,
                unit_price: row.unit_price,
                note: row.note,
                kitchen_status: row.kitchen_status,
                display_in_kitchen: row.display_in_kitchen,
                created_at: row.item_created_at,
                product_name_vi: row.product_name_vi,
                product_name_ja: row.product_name_ja,
                product_name_en: row.product_name_en,
                image_url: row.image_url,
            }));

        res.json({
            success: true,
            data: { order, items },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/client/order/items - Add item to order (customer)
router.post('/order/items', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, product_id, quantity = 1, note } = req.body;

        if (!token) {
            throw new ApiError('Session token required', 400, 'TOKEN_REQUIRED');
        }

        // Get session and table
        const sessionResult = await query(`
            SELECT ts.id as session_id, ts.table_id, t.number as table_number
            FROM table_sessions ts
            JOIN tables t ON ts.table_id = t.id
            WHERE ts.session_token = $1 AND ts.ended_at IS NULL
        `, [token]);

        if (sessionResult.rows.length === 0) {
            throw new ApiError('Invalid session', 401, 'INVALID_SESSION');
        }

        const { session_id, table_id, table_number } = sessionResult.rows[0];

        // Get or create order
        let orderId: string;
        const existingOrder = await query(
            `SELECT id FROM orders WHERE table_session_id = $1 AND status = 'open'`,
            [session_id]
        );

        if (existingOrder.rows.length > 0) {
            orderId = existingOrder.rows[0].id;
        } else {
            const newOrder = await query(
                `INSERT INTO orders (table_id, table_session_id, status)
                 VALUES ($1, $2, 'open')
                 RETURNING id`,
                [table_id, session_id]
            );
            orderId = newOrder.rows[0].id;

            // Update table status to occupied when first order is created
            await query(`UPDATE tables SET status = 'occupied' WHERE id = $1`, [table_id]);
        }

        // Get product
        const productResult = await query(
            'SELECT * FROM products WHERE id = $1 AND is_available = true',
            [product_id]
        );

        if (productResult.rows.length === 0) {
            throw new ApiError('Product not available', 400, 'PRODUCT_UNAVAILABLE');
        }

        const product = productResult.rows[0];

        // Explicitly convert display_in_kitchen to boolean
        const displayInKitchen = product.display_in_kitchen === true || product.display_in_kitchen === 'true' || product.display_in_kitchen === 't';

        // Add item
        const itemResult = await query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price, display_in_kitchen, note)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [orderId, product_id, quantity, product.price, displayInKitchen, note || null]
        );

        // Update order total
        const totalResult = await query(
            `UPDATE orders SET 
                subtotal = (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items WHERE order_id = $1),
                total = (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items WHERE order_id = $1) - discount_amount
             WHERE id = $1
             RETURNING *`,
            [orderId]
        );

        // Emit socket events
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            // Sync cart to other devices at same table
            io.to(`table-${token}`).emit('cart:updated', {
                order: totalResult.rows[0],
                item: itemResult.rows[0],
            });

            // Notify kitchen if kitchen item
            if (displayInKitchen) {
                io.to('kitchen-room').emit('kitchen:new_item', {
                    item: {
                        ...itemResult.rows[0],
                        product_name_vi: product.name_vi,
                        kitchen_status: 'pending'
                    },
                    table_number,
                });

                io.to('kitchen-room').emit('play:notification_sound');
            }

            // Notify POS about new order item
            io.to('pos-room').emit('order:item_added', {
                order_id: orderId,
                table_number,
                item: itemResult.rows[0],
            });

            // Notify POS to refresh table status
            io.to('pos-room').emit('tables:refresh', {
                table_id: table_id,
                status: 'occupied',
            });
        }

        res.status(201).json({
            success: true,
            data: {
                item: itemResult.rows[0],
                order: totalResult.rows[0],
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/client/service-call - Call staff
router.post('/service-call', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token, type, message } = req.body;

        if (!token) {
            throw new ApiError('Session token required', 400, 'TOKEN_REQUIRED');
        }

        // Get session
        const sessionResult = await query(`
            SELECT ts.table_id, t.number as table_number, t.name as table_name
            FROM table_sessions ts
            JOIN tables t ON ts.table_id = t.id
            WHERE ts.session_token = $1 AND ts.ended_at IS NULL
        `, [token]);

        if (sessionResult.rows.length === 0) {
            throw new ApiError('Invalid session', 401, 'INVALID_SESSION');
        }

        const { table_id, table_number, table_name } = sessionResult.rows[0];

        // Create service call record
        const callResult = await query(
            `INSERT INTO service_calls (table_id, type, message)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [table_id, type || 'service', message || null]
        );

        // Emit to POS
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.to('pos-room').emit('service:call', {
                call: callResult.rows[0],
                table_number,
                table_name,
                type,
                message,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Service call sent',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/client/request-bill - Request bill
router.post('/request-bill', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.body;

        if (!token) {
            throw new ApiError('Session token required', 400, 'TOKEN_REQUIRED');
        }

        const sessionResult = await query(`
            SELECT ts.table_id, ts.id as session_id, t.number as table_number, t.name as table_name
            FROM table_sessions ts
            JOIN tables t ON ts.table_id = t.id
            WHERE ts.session_token = $1 AND ts.ended_at IS NULL
        `, [token]);

        if (sessionResult.rows.length === 0) {
            throw new ApiError('Invalid session', 401, 'INVALID_SESSION');
        }

        const { table_id, session_id, table_number, table_name } = sessionResult.rows[0];

        // Update order status to pending_payment
        await query(
            `UPDATE orders SET status = 'pending_payment' WHERE table_session_id = $1 AND status = 'open'`,
            [session_id]
        );

        // Create bill request service call
        await query(
            `INSERT INTO service_calls (table_id, type, message)
             VALUES ($1, 'bill', 'Khách yêu cầu thanh toán')`,
            [table_id]
        );

        // Emit to POS
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.to('pos-room').emit('service:call', {
                table_number,
                table_name,
                type: 'bill',
                message: 'Khách yêu cầu thanh toán',
                urgent: true,
            });
        }

        res.json({
            success: true,
            message: 'Bill requested',
        });
    } catch (error) {
        next(error);
    }
});

export { router as clientRouter };
