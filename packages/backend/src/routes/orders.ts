import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, getClient } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { Server as SocketIOServer } from 'socket.io';
import { logAudit } from './audit.js';
import { TelegramAlerts } from '../services/telegram.js';

const router = Router();

// Validation schemas
const createOrderSchema = z.object({
    table_id: z.string().uuid().optional().nullable(),
    table_session_id: z.string().uuid().optional(),
    customer_id: z.string().uuid().optional(),
    order_type: z.enum(['dine_in', 'takeaway', 'retail']).default('dine_in'),
    note: z.string().optional(),
});

const addItemSchema = z.object({
    product_id: z.string().uuid().optional(),
    // For open items
    open_item_name: z.string().max(100).optional(),
    open_item_price: z.number().positive().optional(),
    display_in_kitchen: z.boolean().optional(),
    //
    quantity: z.number().int().positive().default(1),
    note: z.string().max(255).optional(),
});

const applyDiscountSchema = z.object({
    type: z.enum(['percent', 'fixed']),
    value: z.number().positive(),
    reason: z.string().optional(),
    pin: z.string().length(6).optional(), // Required for deep discounts
});

// GET /api/orders/history - Get order history with filters
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date, payment_method, limit = 100 } = req.query;

        let sql = `
      SELECT 
        o.*,
        t.number as table_number,
        t.name as table_name,
        u.name as cashier_name,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT p.method FROM payments p WHERE p.order_id = o.id ORDER BY p.amount DESC LIMIT 1) as payment_method,
        pm.name as payment_method_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT method FROM payments WHERE order_id = o.id ORDER BY amount DESC LIMIT 1
      ) pay ON true
      LEFT JOIN payment_methods pm ON pay.method = pm.code
      WHERE o.status = 'paid'
    `;
        const params: unknown[] = [];
        let paramCount = 1;

        if (start_date) {
            sql += ` AND o.paid_at >= $${paramCount++}`;
            params.push(start_date);
        }

        if (end_date) {
            // Add 1 day to include the full end date
            sql += ` AND o.paid_at < ($${paramCount++}::date + interval '1 day')`;
            params.push(end_date);
        }

        if (payment_method && payment_method !== 'all') {
            sql += ` AND pay.method = $${paramCount++}`;
            params.push(payment_method);
        }

        sql += ` ORDER BY o.paid_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await query(sql, params);

        res.json({
            success: true,
            data: { orders: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/orders/stats - Get order statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get counts by status
        const countResult = await query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'open') as open_count,
                COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
                COALESCE(SUM(total) FILTER (WHERE status = 'paid' AND DATE(created_at) = CURRENT_DATE), 0) as today_revenue,
                COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as total_revenue
            FROM orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `);

        const stats = countResult.rows[0];

        res.json({
            success: true,
            data: {
                open: parseInt(stats.open_count) || 0,
                paid: parseInt(stats.paid_count) || 0,
                cancelled: parseInt(stats.cancelled_count) || 0,
                todayRevenue: parseFloat(stats.today_revenue) || 0,
                totalRevenue: parseFloat(stats.total_revenue) || 0
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/orders - List orders
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, table_id, date, limit = 50 } = req.query;

        let sql = `
      SELECT 
        o.*,
        t.number as table_number,
        t.name as table_name,
        u.name as cashier_name,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
        const params: unknown[] = [];
        let paramCount = 1;

        if (status) {
            sql += ` AND o.status = $${paramCount++}`;
            params.push(status);
        }

        if (table_id) {
            sql += ` AND o.table_id = $${paramCount++}`;
            params.push(table_id);
        }

        if (date) {
            sql += ` AND DATE(o.created_at) = $${paramCount++}`;
            params.push(date);
        }

        sql += ` ORDER BY o.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await query(sql, params);

        res.json({
            success: true,
            data: { orders: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/orders/:id - Get order with items
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const orderResult = await query(`
      SELECT 
        o.*,
        t.number as table_number,
        t.name as table_name,
        u.name as cashier_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [id]);

        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const itemsResult = await query(`
      SELECT 
        oi.*,
        p.name_vi as product_name_vi,
        p.name_ja as product_name_ja,
        p.name_en as product_name_en
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `, [id]);

        const paymentsResult = await query(
            'SELECT * FROM payments WHERE order_id = $1',
            [id]
        );

        res.json({
            success: true,
            data: {
                order: {
                    ...orderResult.rows[0],
                    items: itemsResult.rows,
                    payments: paymentsResult.rows,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/orders/:id - Delete empty orders only (no PIN required)
// Used for auto-cleanup of takeaway/retail orders that were opened but never had items added
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Check order exists
        const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const order = orderResult.rows[0];

        // Cannot delete paid or cancelled orders
        if (order.status === 'paid') {
            throw new ApiError('Cannot delete a paid order', 400, 'ORDER_PAID');
        }
        if (order.status === 'cancelled') {
            throw new ApiError('Cannot delete a cancelled order', 400, 'ORDER_CANCELLED');
        }

        // Check for items - only allow deletion if order is empty
        const itemsResult = await query('SELECT COUNT(*) FROM order_items WHERE order_id = $1', [id]);
        const itemCount = parseInt(itemsResult.rows[0].count, 10);

        if (itemCount > 0) {
            throw new ApiError('Cannot delete order with items. Use cancel endpoint instead.', 400, 'ORDER_HAS_ITEMS');
        }

        // Delete the empty order
        await query('DELETE FROM orders WHERE id = $1', [id]);

        // Log audit
        await logAudit({
            userId: req.user?.id,
            action: 'delete_empty_order',
            targetType: 'order',
            targetId: id,
            oldValue: order,
            ipAddress: req.ip,
        });

        res.json({
            success: true,
            message: 'Empty order deleted successfully',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/orders - Create order
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = createOrderSchema.parse(req.body);
        const userId = req.user?.id;

        // For dine_in orders, get active session for table if not provided
        let tableSessionId = data.table_session_id;
        if (data.order_type === 'dine_in' && data.table_id && !tableSessionId) {
            const sessionResult = await query(
                'SELECT id FROM table_sessions WHERE table_id = $1 AND ended_at IS NULL',
                [data.table_id]
            );
            if (sessionResult.rows.length > 0) {
                tableSessionId = sessionResult.rows[0].id;
            }
        }

        const result = await query(
            `INSERT INTO orders (table_id, table_session_id, customer_id, user_id, note, order_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [data.table_id || null, tableSessionId || null, data.customer_id || null, userId, data.note || null, data.order_type]
        );

        // Emit socket event
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.to('pos-room').emit('order:created', { order: result.rows[0] });
        }

        res.status(201).json({
            success: true,
            data: { order: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/orders/:id/items - Add item to order
router.post('/:id/items', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id: orderId } = req.params;
        const data = addItemSchema.parse(req.body);

        // Check order exists and is open
        const orderResult = await query(
            'SELECT * FROM orders WHERE id = $1',
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        if (orderResult.rows[0].status !== 'open') {
            throw new ApiError('Cannot add items to closed order', 400, 'ORDER_CLOSED');
        }

        let item;

        if (data.product_id) {
            // Regular product
            const productResult = await query(
                'SELECT * FROM products WHERE id = $1',
                [data.product_id]
            );

            if (productResult.rows.length === 0) {
                throw new ApiError('Product not found', 404, 'PRODUCT_NOT_FOUND');
            }

            const product = productResult.rows[0];

            if (!product.is_available) {
                throw new ApiError('Product is sold out', 400, 'PRODUCT_SOLD_OUT');
            }

            // Explicitly convert display_in_kitchen to boolean (fix for PostgreSQL type issues)
            const displayInKitchen = product.display_in_kitchen === true || product.display_in_kitchen === 'true' || product.display_in_kitchen === 't';
            console.log(`[POS Order] Product: ${product.name_vi}, display_in_kitchen raw: ${product.display_in_kitchen} (${typeof product.display_in_kitchen}), converted: ${displayInKitchen}`);

            const itemResult = await query(
                `INSERT INTO order_items (order_id, product_id, quantity, unit_price, display_in_kitchen, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [orderId, data.product_id, data.quantity, product.price, displayInKitchen, data.note || null]
            );

            // Include product names in response for cart display
            item = {
                ...itemResult.rows[0],
                product_name_vi: product.name_vi,
                product_name_ja: product.name_ja,
            };

            // Note: Kitchen items are now sent manually via /send-to-kitchen endpoint
            // They stay as 'pending' until cashier clicks [GỬI BẾP]
        } else if (data.open_item_name && data.open_item_price) {
            // Open item
            const itemResult = await query(
                `INSERT INTO order_items (order_id, open_item_name, open_item_price, quantity, unit_price, display_in_kitchen, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
                [orderId, data.open_item_name, data.open_item_price, data.quantity, data.open_item_price, data.display_in_kitchen || false, data.note || null]
            );

            item = itemResult.rows[0];

            // Note: Kitchen items are now sent manually via /send-to-kitchen endpoint
        } else {
            throw new ApiError('Either product_id or open_item details required', 400, 'INVALID_REQUEST');
        }

        // Recalculate order total
        await recalculateOrderTotal(orderId);

        res.status(201).json({
            success: true,
            data: { item },
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/orders/:id/items/:itemId - Update item details (note)
router.put('/:id/items/:itemId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id: orderId, itemId } = req.params;
        const { note } = req.body;

        // Check item exists
        const itemResult = await query(
            'SELECT * FROM order_items WHERE id = $1 AND order_id = $2',
            [itemId, orderId]
        );

        if (itemResult.rows.length === 0) {
            throw new ApiError('Item not found', 404, 'NOT_FOUND');
        }

        const item = itemResult.rows[0];

        // Update item (only note for now)
        const updatedItemResult = await query(
            'UPDATE order_items SET note = $1 WHERE id = $2 RETURNING *',
            [note, itemId]
        );

        const updatedItem = updatedItemResult.rows[0];

        // Notify
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('order:item_updated', { orderId, itemId, note });

            // If item is in kitchen, notify kitchen too
            if (item.display_in_kitchen) {
                io.to('kitchen-room').emit('kitchen:item_updated', {
                    itemId,
                    note,
                    orderId
                });
            }
        }

        res.json({
            success: true,
            data: { item: updatedItem },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/orders/:id/items/:itemId - Remove item (may require PIN)
router.delete('/:id/items/:itemId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id: orderId, itemId } = req.params;
        const { pin, reason } = req.body;

        // Check item exists
        const itemResult = await query(
            'SELECT * FROM order_items WHERE id = $1 AND order_id = $2',
            [itemId, orderId]
        );

        if (itemResult.rows.length === 0) {
            throw new ApiError('Item not found', 404, 'NOT_FOUND');
        }

        const item = itemResult.rows[0];

        // If item was sent to kitchen (not pending), require PIN
        if (item.kitchen_status !== 'pending' && item.display_in_kitchen) {
            if (!pin) {
                throw new ApiError('PIN required to cancel kitchen items', 403, 'PIN_REQUIRED');
            }

            const pinResult = await query(
                "SELECT id FROM users WHERE pin_code = $1 AND role = 'owner'",
                [pin]
            );

            if (pinResult.rows.length === 0) {
                throw new ApiError('Invalid PIN', 401, 'INVALID_PIN');
            }
        }

        // Delete item
        await query('DELETE FROM order_items WHERE id = $1', [itemId]);

        // Log to audit
        await query(
            `INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, reason)
       VALUES ($1, 'cancel_item', 'order_item', $2, $3, $4)`,
            [req.user?.id, itemId, JSON.stringify(item), reason || null]
        );

        // Recalculate order total
        await recalculateOrderTotal(orderId);

        // Notify
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('order:item_removed', { orderId, itemId });
            if (item.display_in_kitchen) {
                io.to('kitchen-room').emit('kitchen:item_cancelled', { itemId });
            }
        }

        res.json({
            success: true,
            message: 'Item removed',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/orders/:id/discount - Apply discount
router.post('/:id/discount', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id: orderId } = req.params;
        const data = applyDiscountSchema.parse(req.body);

        // Get order
        const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const order = orderResult.rows[0];

        // Calculate discount amount
        let discountAmount: number;
        if (data.type === 'percent') {
            discountAmount = (order.subtotal * data.value) / 100;

            // If discount > 10%, require PIN
            if (data.value > 10) {
                if (!data.pin) {
                    throw new ApiError('PIN required for discounts over 10%', 403, 'PIN_REQUIRED');
                }
                const pinResult = await query(
                    "SELECT id FROM users WHERE pin_code = $1 AND role = 'owner'",
                    [data.pin]
                );
                if (pinResult.rows.length === 0) {
                    throw new ApiError('Invalid PIN', 401, 'INVALID_PIN');
                }
            }
        } else {
            discountAmount = data.value;
        }

        // Update order
        const result = await query(
            `UPDATE orders 
       SET discount_amount = $1, discount_reason = $2, total = subtotal - $1 + surcharge_amount
       WHERE id = $3
       RETURNING *`,
            [discountAmount, data.reason || null, orderId]
        );

        // Log to audit
        await query(
            `INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value, reason)
       VALUES ($1, 'apply_discount', 'order', $2, $3, $4)`,
            [req.user?.id, orderId, JSON.stringify({ type: data.type, value: data.value, amount: discountAmount }), data.reason || null]
        );

        // Notify boss if significant discount
        if (data.value > 10 || discountAmount > 500) {
            const io: SocketIOServer = req.app.get('io');
            if (io) {
                io.to('boss-room').emit('alert:discount', {
                    order_id: orderId,
                    discount_amount: discountAmount,
                    cashier: req.user?.name,
                });
            }

            // Send Telegram alert
            TelegramAlerts.discountAlert({
                orderId,
                discountPercent: data.type === 'percent' ? data.value : 0,
                discountAmount,
                cashierName: req.user?.name || 'Unknown',
                reason: data.reason,
            }).catch(console.error);
        }

        // Log audit
        await logAudit({
            userId: req.user?.id,
            action: 'discount_applied',
            targetType: 'order',
            targetId: orderId,
            newValue: { type: data.type, value: data.value, discountAmount, reason: data.reason },
            ipAddress: req.ip,
        });

        res.json({
            success: true,
            data: { order: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/orders/:id/pay - Process payment
router.post('/:id/pay', async (req: AuthRequest, res: Response, next: NextFunction) => {
    const client = await getClient();

    try {
        const { id: orderId } = req.params;
        const { payments, voucher_code } = req.body; // Array of payment methods

        await client.query('BEGIN');

        // Get order
        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const order = orderResult.rows[0];

        if (order.status === 'paid') {
            throw new ApiError('Order already paid', 400, 'ALREADY_PAID');
        }

        let finalTotal = Number(order.total);
        let discountAmount = Number(order.discount_amount);
        let discountReason = order.discount_reason;
        let voucherId = null;

        // 1. Voucher processing
        if (voucher_code) {
            const voucherRes = await client.query(
                `SELECT * FROM vouchers WHERE code = $1 AND is_active = true`,
                [voucher_code.toUpperCase()]
            );

            if (voucherRes.rows.length === 0) {
                throw new ApiError('Invalid voucher code', 400, 'INVALID_VOUCHER');
            }

            const voucher = voucherRes.rows[0];
            const now = new Date();

            // Validate voucher
            if (voucher.start_date && new Date(voucher.start_date) > now) throw new ApiError('Voucher not yet active', 400, 'VOUCHER_NOT_ACTIVE');
            if (voucher.end_date && new Date(voucher.end_date) < now) throw new ApiError('Voucher expired', 400, 'VOUCHER_EXPIRED');
            if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) throw new ApiError('Voucher usage limit reached', 400, 'VOUCHER_LIMIT_REACHED');

            // Apply discount
            const subtotal = Number(order.subtotal);
            if (subtotal < Number(voucher.min_order_amount)) throw new ApiError(`Order minimum amount is ${voucher.min_order_amount}`, 400, 'MIN_ORDER_AMOUNT');

            let vDiscount = 0;
            if (voucher.type === 'percent') {
                vDiscount = (subtotal * Number(voucher.value)) / 100;
            } else {
                vDiscount = Number(voucher.value);
            }

            if (voucher.max_discount_amount) {
                vDiscount = Math.min(vDiscount, Number(voucher.max_discount_amount));
            }

            // Update order values
            discountAmount = vDiscount;
            discountReason = `Voucher: ${voucher_code}`;
            const surcharge = Number(order.surcharge_amount);
            finalTotal = subtotal + surcharge - discountAmount;
            voucherId = voucher.id;

            // Inc usage
            await client.query('UPDATE vouchers SET usage_count = usage_count + 1 WHERE id = $1', [voucherId]);
        }

        // 2. Validate payment amount
        let totalPaid = 0;
        const savedPayments = [];
        for (const payment of payments) {
            const paymentResult = await client.query(
                `INSERT INTO payments (order_id, method, amount, received_amount, change_amount, reference)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [orderId, payment.method, payment.amount, payment.received_amount || null, payment.change_amount || null, payment.reference || null]
            );
            savedPayments.push(paymentResult.rows[0]);
            totalPaid += Number(payment.amount);
        }

        // Check if fully paid (allow small float error)
        if (totalPaid < finalTotal - 0.5) {
            throw new ApiError(`Insufficient payment. Need ${finalTotal}, got ${totalPaid}`, 400, 'INSUFFICIENT_PAYMENT');
        }

        // 3. Close order
        const updatedOrder = await client.query(
            `UPDATE orders 
             SET status = 'paid', paid_at = NOW(),
                 discount_amount = $2,
                 discount_reason = $3,
                 total = $4,
                 voucher_id = $5,
                 voucher_code = $6
             WHERE id = $1 
             RETURNING *`,
            [orderId, discountAmount, discountReason, finalTotal, voucherId, voucher_code || null]
        );

        await client.query('COMMIT');

        // 4. Check if ALL orders in this session are now completed (paid/cancelled)
        // Only close session if no remaining open orders
        if (order.table_session_id) {
            const remainingOpenOrders = await query(
                `SELECT id FROM orders 
                 WHERE table_session_id = $1 
                 AND status NOT IN ('paid', 'cancelled')`,
                [order.table_session_id]
            );

            if (remainingOpenOrders.rows.length === 0) {
                // All orders paid/cancelled - close session
                await query(
                    `UPDATE table_sessions 
                     SET status = 'completed', ended_at = NOW() 
                     WHERE id = $1`,
                    [order.table_session_id]
                );

                // 5. Reset table status to available
                if (order.table_id) {
                    await query(
                        `UPDATE tables SET status = 'available', current_order_id = NULL WHERE id = $1`,
                        [order.table_id]
                    );
                }
            }
        }

        // Emit socket event
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('order:paid', { orderId, total: finalTotal });

            // Notify POS about table closure
            if (order.table_id) {
                io.to('pos-room').emit('table:closed', {
                    table_id: order.table_id,
                    order_id: orderId
                });
            }
        }

        // Log audit
        await logAudit({
            userId: req.user?.id,
            action: 'order_paid',
            targetType: 'order',
            targetId: orderId,
            newValue: { total: finalTotal, payments: savedPayments, voucher: voucher_code },
            ipAddress: req.ip,
        });

        res.json({
            success: true,
            message: 'Payment successful',
            data: { order: updatedOrder.rows[0] }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// POST /api/orders/:id/pay-partial - Pay for selected items only (split and pay in one transaction)
router.post('/:id/pay-partial', async (req: AuthRequest, res: Response, next: NextFunction) => {
    const client = await getClient();

    try {
        const { id: orderId } = req.params;
        const { item_ids, payments, discount_amount, discount_reason } = req.body;
        // item_ids: Array of order_item IDs to pay for
        // payments: Array of payment methods (same as /pay)
        // discount_amount, discount_reason: Optional discount for this partial payment

        if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
            throw new ApiError('No items selected for payment', 400, 'INVALID_REQUEST');
        }

        if (!payments || !Array.isArray(payments) || payments.length === 0) {
            throw new ApiError('Payment method required', 400, 'INVALID_REQUEST');
        }

        await client.query('BEGIN');

        // 1. Get original order
        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const originalOrder = orderResult.rows[0];

        if (originalOrder.status === 'paid') {
            throw new ApiError('Order already fully paid', 400, 'ALREADY_PAID');
        }

        // 2. Get all items in this order
        const allItemsResult = await client.query(
            'SELECT * FROM order_items WHERE order_id = $1',
            [orderId]
        );
        const allItems = allItemsResult.rows;

        // 3. Get selected items
        const selectedItemsResult = await client.query(
            'SELECT * FROM order_items WHERE id = ANY($1) AND order_id = $2',
            [item_ids, orderId]
        );
        const selectedItems = selectedItemsResult.rows;

        if (selectedItems.length !== item_ids.length) {
            throw new ApiError('Some items not found in this order', 400, 'INVALID_ITEMS');
        }

        // 4. Calculate total for selected items
        const selectedSubtotal = selectedItems.reduce((sum, item) =>
            sum + (Number(item.quantity) * Number(item.unit_price)), 0);

        // Apply discount if provided
        const finalDiscount = Number(discount_amount) || 0;
        const selectedTotal = selectedSubtotal - finalDiscount;

        // 5. Validate payment amount
        let totalPaid = 0;
        for (const payment of payments) {
            totalPaid += Number(payment.amount);
        }

        if (totalPaid < selectedTotal - 0.5) {
            throw new ApiError(`Insufficient payment. Need ${selectedTotal}, got ${totalPaid}`, 400, 'INSUFFICIENT_PAYMENT');
        }

        // 6. Check if paying ALL items (full payment, not partial)
        const isFullPayment = allItems.length === selectedItems.length;

        if (isFullPayment) {
            // Full payment - just use regular pay logic
            // Insert payments
            const savedPayments = [];
            for (const payment of payments) {
                const paymentResult = await client.query(
                    `INSERT INTO payments (order_id, method, amount, received_amount, change_amount, reference)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *`,
                    [orderId, payment.method, payment.amount, payment.received_amount || null, payment.change_amount || null, payment.reference || null]
                );
                savedPayments.push(paymentResult.rows[0]);
            }

            // Update order to paid
            const updatedOrder = await client.query(
                `UPDATE orders 
                 SET status = 'paid', paid_at = NOW(),
                     discount_amount = COALESCE(discount_amount, 0) + $2,
                     discount_reason = COALESCE(discount_reason || ' | ', '') || COALESCE($3, ''),
                     total = subtotal - discount_amount - $2 + surcharge_amount
                 WHERE id = $1 
                 RETURNING *`,
                [orderId, finalDiscount, discount_reason || null]
            );

            await client.query('COMMIT');

            // Check if ALL orders in session are completed before closing
            if (originalOrder.table_session_id) {
                const remainingOpenOrders = await query(
                    `SELECT id FROM orders 
                     WHERE table_session_id = $1 
                     AND status NOT IN ('paid', 'cancelled')`,
                    [originalOrder.table_session_id]
                );

                if (remainingOpenOrders.rows.length === 0) {
                    await query(
                        `UPDATE table_sessions 
                         SET status = 'completed', ended_at = NOW() 
                         WHERE id = $1`,
                        [originalOrder.table_session_id]
                    );

                    if (originalOrder.table_id) {
                        await query(
                            `UPDATE tables SET status = 'available', current_order_id = NULL WHERE id = $1`,
                            [originalOrder.table_id]
                        );
                    }
                }
            }

            // Emit socket event
            const io: SocketIOServer = req.app.get('io');
            if (io) {
                io.emit('order:paid', { orderId, total: selectedTotal });
                if (originalOrder.table_id) {
                    io.to('pos-room').emit('table:closed', {
                        table_id: originalOrder.table_id,
                        order_id: orderId
                    });
                }
            }

            res.json({
                success: true,
                message: 'Full payment successful',
                data: {
                    order: updatedOrder.rows[0],
                    is_partial: false
                }
            });
        } else {
            // PARTIAL PAYMENT - Create new order for paid items, keep original open

            // 7. Create new order for the paid items
            const paidOrderResult = await client.query(
                `INSERT INTO orders (table_id, table_session_id, user_id, note, subtotal, total, status, paid_at, discount_amount, discount_reason)
                 VALUES ($1, $2, $3, $4, $5, $6, 'paid', NOW(), $7, $8)
                 RETURNING *`,
                [
                    originalOrder.table_id,
                    originalOrder.table_session_id,
                    req.user?.id,
                    `Thanh toán 1 phần từ đơn #${originalOrder.order_number || orderId}`,
                    selectedSubtotal,
                    selectedTotal,
                    finalDiscount,
                    discount_reason || null
                ]
            );
            const paidOrder = paidOrderResult.rows[0];

            // 8. Move selected items to the new paid order
            await client.query(
                'UPDATE order_items SET order_id = $1 WHERE id = ANY($2)',
                [paidOrder.id, item_ids]
            );

            // 9. Insert payments for the paid order
            const savedPayments = [];
            for (const payment of payments) {
                const paymentResult = await client.query(
                    `INSERT INTO payments (order_id, method, amount, received_amount, change_amount, reference)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *`,
                    [paidOrder.id, payment.method, payment.amount, payment.received_amount || null, payment.change_amount || null, payment.reference || null]
                );
                savedPayments.push(paymentResult.rows[0]);
            }

            // 10. Recalculate original order (remaining items)
            const remainingItemsResult = await client.query(
                'SELECT SUM(quantity * unit_price) as subtotal FROM order_items WHERE order_id = $1',
                [orderId]
            );
            const remainingSubtotal = Number(remainingItemsResult.rows[0].subtotal) || 0;

            const updatedOriginalOrder = await client.query(
                `UPDATE orders 
                 SET subtotal = $1, total = $1 + surcharge_amount
                 WHERE id = $2 
                 RETURNING *`,
                [remainingSubtotal, orderId]
            );

            await client.query('COMMIT');

            // Log audit
            await logAudit({
                userId: req.user?.id,
                action: 'partial_payment',
                targetType: 'order',
                targetId: orderId,
                newValue: {
                    paid_items: item_ids,
                    paid_total: selectedTotal,
                    new_order_id: paidOrder.id,
                    remaining_total: remainingSubtotal
                },
                ipAddress: req.ip,
            });

            // Emit socket events
            const io: SocketIOServer = req.app.get('io');
            if (io) {
                // Notify about partial payment
                io.emit('order:partial_paid', {
                    original_order_id: orderId,
                    paid_order_id: paidOrder.id,
                    paid_items: item_ids.length,
                    paid_total: selectedTotal,
                    remaining_total: remainingSubtotal,
                    remaining_items: allItems.length - selectedItems.length
                });

                // Notify POS to refresh the order
                io.to('pos-room').emit('order:updated', {
                    order_id: orderId,
                    remaining_total: remainingSubtotal
                });
            }

            res.json({
                success: true,
                message: `Đã thanh toán ${selectedItems.length} món. Còn lại ${allItems.length - selectedItems.length} món.`,
                data: {
                    paid_order: paidOrder,
                    original_order: updatedOriginalOrder.rows[0],
                    is_partial: true,
                    paid_items_count: selectedItems.length,
                    remaining_items_count: allItems.length - selectedItems.length,
                    remaining_total: remainingSubtotal
                }
            });
        }
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// POST /api/orders/:id/cancel - Cancel an unpaid order
router.post('/:id/cancel', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id: orderId } = req.params;
        const { reason, pin } = req.body;

        // Verify PIN
        if (!pin) {
            throw new ApiError('PIN required to cancel order', 403, 'PIN_REQUIRED');
        }

        const pinResult = await query(
            "SELECT id, name FROM users WHERE pin_code = $1 AND role IN ('owner', 'manager', 'admin')",
            [pin]
        );

        if (pinResult.rows.length === 0) {
            throw new ApiError('Invalid PIN', 401, 'INVALID_PIN');
        }

        const cancelledBy = pinResult.rows[0];

        // Get order
        const orderResult = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const order = orderResult.rows[0];

        if (order.status === 'paid') {
            throw new ApiError('Cannot cancel a paid order', 400, 'ORDER_PAID');
        }

        if (order.status === 'cancelled') {
            throw new ApiError('Order already cancelled', 400, 'ALREADY_CANCELLED');
        }

        // Cancel order
        const updatedOrder = await query(
            `UPDATE orders 
             SET status = 'cancelled', 
                 cancelled_at = NOW(),
                 cancelled_by = $2,
                 cancel_reason = $3
             WHERE id = $1 
             RETURNING *`,
            [orderId, cancelledBy.id, reason || 'Cancelled by staff']
        );

        // Release table if dine_in
        if (order.table_id) {
            await query(
                `UPDATE tables SET status = 'available', current_order_id = NULL WHERE id = $1`,
                [order.table_id]
            );
        }

        // Log audit
        await logAudit(req, 'cancel_order', 'order', orderId, order, reason);

        // Notify via socket
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('order:cancelled', { orderId, cancelledBy: cancelledBy.name, reason });
            io.to('kitchen-room').emit('kitchen:order_cancelled', { orderId, reason });
        }

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: { order: updatedOrder.rows[0] }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/orders/:id/split - Split order (move selected items to new order)
router.post('/:id/split', async (req: AuthRequest, res: Response, next: NextFunction) => {
    const client = await getClient();

    try {
        const { id: orderId } = req.params;
        const { item_ids } = req.body; // Array of order_item IDs to move

        if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
            throw new ApiError('No items selected for split', 400, 'INVALID_REQUEST');
        }

        await client.query('BEGIN');

        // Get original order
        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const originalOrder = orderResult.rows[0];

        if (originalOrder.status === 'paid') {
            throw new ApiError('Cannot split a paid order', 400, 'ORDER_PAID');
        }

        // Verify all items belong to this order
        const itemsResult = await client.query(
            'SELECT * FROM order_items WHERE id = ANY($1) AND order_id = $2',
            [item_ids, orderId]
        );

        if (itemsResult.rows.length !== item_ids.length) {
            throw new ApiError('Some items not found in this order', 400, 'INVALID_ITEMS');
        }

        // Create new order for split items
        const newOrderResult = await client.query(
            `INSERT INTO orders (table_id, table_session_id, user_id, note)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [originalOrder.table_id, originalOrder.table_session_id, req.user?.id, 'Tách từ bill gốc']
        );

        const newOrder = newOrderResult.rows[0];

        // Move selected items to new order
        await client.query(
            'UPDATE order_items SET order_id = $1 WHERE id = ANY($2)',
            [newOrder.id, item_ids]
        );

        // Recalculate totals for both orders
        // Original order
        const origItemsResult = await client.query(
            'SELECT SUM(quantity * unit_price) as subtotal FROM order_items WHERE order_id = $1',
            [orderId]
        );
        const origSubtotal = origItemsResult.rows[0].subtotal || 0;
        await client.query(
            `UPDATE orders SET subtotal = $1, total = $1 - discount_amount + surcharge_amount WHERE id = $2`,
            [origSubtotal, orderId]
        );

        // New order
        const newItemsResult = await client.query(
            'SELECT SUM(quantity * unit_price) as subtotal FROM order_items WHERE order_id = $1',
            [newOrder.id]
        );
        const newSubtotal = newItemsResult.rows[0].subtotal || 0;
        await client.query(
            `UPDATE orders SET subtotal = $1, total = $1 WHERE id = $2`,
            [newSubtotal, newOrder.id]
        );

        await client.query('COMMIT');

        // Emit socket event
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('order:split', {
                original_order_id: orderId,
                new_order_id: newOrder.id,
                split_items: item_ids.length
            });
        }

        res.json({
            success: true,
            message: 'Order split successfully',
            data: {
                original_order_id: orderId,
                new_order: { ...newOrder, subtotal: newSubtotal, total: newSubtotal }
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// POST /api/orders/:id/send-to-kitchen - Manually send pending items to kitchen
router.post('/:id/send-to-kitchen', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id: orderId } = req.params;

        // Get order with table info
        const orderResult = await query(
            `SELECT o.*, t.number as table_number, t.name as table_name
             FROM orders o
             LEFT JOIN tables t ON o.table_id = t.id
             WHERE o.id = $1`,
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const order = orderResult.rows[0];

        // Get pending items that need to go to kitchen
        const pendingItemsResult = await query(
            `SELECT oi.*, p.name_vi as product_name_vi, p.name_ja as product_name_ja
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $1 
               AND oi.display_in_kitchen = true 
               AND oi.kitchen_status = 'pending'`,
            [orderId]
        );

        const pendingItems = pendingItemsResult.rows;

        if (pendingItems.length === 0) {
            res.json({
                success: true,
                message: 'No pending items to send to kitchen',
                data: { sent_count: 0 }
            });
            return;
        }

        // Update all pending kitchen items to 'preparing'
        const itemIds = pendingItems.map(item => item.id);
        await query(
            `UPDATE order_items 
             SET kitchen_status = 'preparing'
             WHERE id = ANY($1)`,
            [itemIds]
        );

        // Emit socket event to kitchen
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            // Send each item as a new kitchen notification
            for (const item of pendingItems) {
                io.to('kitchen-room').emit('kitchen:new_item', {
                    item: {
                        ...item,
                        kitchen_status: 'preparing',
                        product_name_vi: item.product_name_vi || item.open_item_name,
                    },
                    table_number: order.table_number,
                    table_name: order.table_name,
                    order_number: order.order_number,
                });
            }

            // Also emit a batch update
            io.to('kitchen-room').emit('kitchen:batch_update', {
                order_id: orderId,
                items: pendingItems.map(item => ({
                    ...item,
                    kitchen_status: 'preparing'
                })),
                table_number: order.table_number,
                table_name: order.table_name,
                order_number: order.order_number,
            });
        }

        // Play notification sound on kitchen devices
        if (io) {
            io.to('kitchen-room').emit('play:notification_sound');
        }

        res.json({
            success: true,
            message: `Sent ${pendingItems.length} item(s) to kitchen`,
            data: {
                sent_count: pendingItems.length,
                items: pendingItems.map(item => ({
                    id: item.id,
                    name: item.product_name_vi || item.open_item_name,
                    quantity: item.quantity,
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

// =============================================
// DEBT ORDERS (Khách Nợ)
// =============================================

// GET /api/orders/debt - Get all debt orders
router.get('/debt', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT 
                o.*,
                t.number as table_number,
                t.name as table_name,
                u.name as cashier_name,
                dm.name as debt_marked_by_name,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN users dm ON o.debt_marked_by = dm.id
            WHERE o.status = 'debt'
            ORDER BY o.debt_marked_at DESC
        `);

        res.json({
            success: true,
            data: {
                orders: result.rows,
                total: result.rows.length,
                total_amount: result.rows.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0)
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/orders/:id/mark-debt - Mark order as debt
router.post('/:id/mark-debt', async (req: AuthRequest, res: Response, next: NextFunction) => {
    const client = await getClient();
    try {
        const { id: orderId } = req.params;
        const { note, pin } = req.body;

        // Verify PIN
        if (pin) {
            const pinResult = await client.query(
                'SELECT id, name, role FROM users WHERE pin_code = $1 AND is_active = true',
                [pin]
            );
            if (pinResult.rows.length === 0) {
                throw new ApiError('Invalid PIN', 401, 'INVALID_PIN');
            }
        }

        await client.query('BEGIN');

        // Get order
        const orderResult = await client.query(
            'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            throw new ApiError('Order not found', 404, 'NOT_FOUND');
        }

        const order = orderResult.rows[0];

        if (order.status === 'paid') {
            throw new ApiError('Cannot mark paid order as debt', 400, 'ORDER_PAID');
        }

        if (order.status === 'cancelled') {
            throw new ApiError('Cannot mark cancelled order as debt', 400, 'ORDER_CANCELLED');
        }

        if (order.status === 'debt') {
            throw new ApiError('Order is already marked as debt', 400, 'ALREADY_DEBT');
        }

        // Mark as debt
        await client.query(`
            UPDATE orders 
            SET status = 'debt',
                debt_marked_at = NOW(),
                debt_marked_by = $2,
                debt_note = $3
            WHERE id = $1
        `, [orderId, req.user?.id, note || null]);

        // Close the table session if exists
        if (order.table_session_id) {
            await client.query(`
                UPDATE table_sessions 
                SET ended_at = NOW(), status = 'completed' 
                WHERE id = $1 AND ended_at IS NULL
            `, [order.table_session_id]);
        }

        // Reset table if exists
        if (order.table_id) {
            await client.query(`
                UPDATE tables 
                SET status = 'available', current_order_id = NULL 
                WHERE id = $1
            `, [order.table_id]);
        }

        await client.query('COMMIT');

        // Log audit
        logAudit(client, {
            user_id: req.user?.id || null,
            action: 'MARK_DEBT',
            resource_type: 'order',
            resource_id: orderId,
            details: { order_number: order.order_number, total: order.total, note }
        });

        // Emit socket event
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('order:debt', { order_id: orderId, order_number: order.order_number });
            if (order.table_id) {
                io.to('pos-room').emit('table:closed', { table_id: order.table_id });
            }
        }

        res.json({
            success: true,
            message: 'Order marked as debt successfully',
            data: { order_id: orderId, status: 'debt' }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
});

// Helper function to recalculate order total
async function recalculateOrderTotal(orderId: string) {
    const itemsResult = await query(
        'SELECT SUM(quantity * unit_price) as subtotal FROM order_items WHERE order_id = $1',
        [orderId]
    );

    const subtotal = itemsResult.rows[0].subtotal || 0;

    await query(
        `UPDATE orders 
     SET subtotal = $1, total = $1 - discount_amount + surcharge_amount
     WHERE id = $2`,
        [subtotal, orderId]
    );
}

export { router as ordersRouter };

