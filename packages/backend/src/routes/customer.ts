import express from 'express';
import { query } from '../db/pool.js';

export const customerRouter = express.Router();

// ============================================
// PUBLIC ROUTES - No authentication required
// ============================================

/**
 * GET /api/customer/menu/:tableId
 * Get menu for customer view (public)
 */
customerRouter.get('/menu/:tableId', async (req, res) => {
    try {
        const { tableId } = req.params;

        // Verify table exists
        const tableResult = await query(
            'SELECT id, number, name FROM tables WHERE id = $1',
            [tableId]
        );

        if (tableResult.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy bàn' });
            return;
        }

        const table = tableResult.rows[0];

        // Get categories with products (using actual column names)
        const categoriesResult = await query(`
            SELECT 
                c.id, c.name_vi as name, c.sort_order,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', p.id,
                            'name', p.name_vi,
                            'price', p.price,
                            'description', '',
                            'image_url', p.image_url,
                            'available', p.is_available,
                            'is_best_seller', COALESCE(p.is_best_seller, false),
                            'is_chef_choice', COALESCE(p.is_chef_choice, false),
                            'is_combo', COALESCE(p.is_combo, false)
                        ) ORDER BY p.sort_order, p.name_vi
                    ) FILTER (WHERE p.id IS NOT NULL AND p.is_available = true),
                    '[]'
                ) as products
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_available = true AND p.is_tablet_visible = true
            WHERE c.is_active = true AND c.is_tablet_visible = true
            GROUP BY c.id
            ORDER BY c.sort_order ASC
        `);

        const settingsResult = await query(`
            SELECT key, value FROM settings 
            WHERE key IN ('customer_banner_url', 'customer_logo_url', 'customer_primary_color', 'customer_welcome_heading', 'customer_welcome_message', 'customer_service_buttons')
        `);

        const settings: Record<string, any> = {};
        settingsResult.rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        });

        res.json({
            table,
            categories: categoriesResult.rows,
            settings
        });
    } catch (error) {
        console.error('Customer menu error:', error);
        res.status(500).json({ error: 'Lỗi tải menu' });
    }
});

/**
 * GET /api/customer/menu-v3/:tableId
 * Get menu for customer V3 view with multilingual support
 * Query params: lang=vi|jp|cn (default: vi)
 */
customerRouter.get('/menu-v3/:tableId', async (req, res) => {
    try {
        const { tableId } = req.params;
        const lang = (req.query.lang as string) || 'vi';

        // Verify table exists
        let tableResult;

        if (tableId === 'test-table') {
            // For testing: get the first available table
            tableResult = await query('SELECT id, number, name FROM tables ORDER BY number ASC LIMIT 1');
        } else {
            tableResult = await query(
                'SELECT id, number, name FROM tables WHERE id = $1',
                [tableId]
            );
        }

        if (tableResult.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy bàn' });
            return;
        }

        const table = tableResult.rows[0];

        // Dynamic column selection based on language (with table alias for products)
        const pNameCol = lang === 'vi' ? 'p.name_vi' : lang === 'jp' ? 'COALESCE(p.name_jp, p.name_vi)' : 'COALESCE(p.name_cn, p.name_vi)';
        const pDescCol = lang === 'vi' ? 'p.description_vi' : lang === 'jp' ? 'COALESCE(p.description_jp, p.description_vi)' : 'COALESCE(p.description_cn, p.description_vi)';
        // For categories
        const cNameCol = lang === 'vi' ? 'c.name_vi' : lang === 'jp' ? 'COALESCE(c.name_jp, c.name_vi)' : 'COALESCE(c.name_cn, c.name_vi)';

        // Get categories with products (multilingual)
        const categoriesResult = await query(`
            SELECT 
                c.id, 
                ${cNameCol} as name, 
                c.sort_order,
                c.icon,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', p.id,
                            'name', ${pNameCol},
                            'price', p.price,
                            'description', ${pDescCol},
                            'image_url', p.image_url,
                            'available', p.is_available,
                            'is_featured', COALESCE(p.is_featured, false),
                            'featured_badge', p.featured_badge,
                            'is_best_seller', COALESCE(p.is_best_seller, false),
                            'is_chef_choice', COALESCE(p.is_chef_choice, false),
                            'is_combo', COALESCE(p.is_combo, false)
                        ) ORDER BY p.sort_order, p.name_vi
                    ) FILTER (WHERE p.id IS NOT NULL AND p.is_available = true),
                    '[]'
                ) as products
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_available = true AND p.is_tablet_visible = true
            WHERE c.is_active = true AND c.is_tablet_visible = true
            GROUP BY c.id
            ORDER BY c.sort_order ASC
        `);

        // Get featured products
        const featuredResult = await query(`
            SELECT 
                p.id,
                ${pNameCol} as name,
                p.price,
                ${pDescCol} as description,
                p.image_url,
                p.featured_badge,
                p.featured_order,
                c.id as category_id,
                ${cNameCol} as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_featured = true AND p.is_available = true AND p.is_tablet_visible = true
            ORDER BY p.featured_order ASC
            LIMIT 10
        `);

        // Get slideshow images
        const slideshowResult = await query(`
            SELECT 
                id,
                image_url,
                ${lang === 'vi' ? 'title_vi' : lang === 'jp' ? 'COALESCE(title_jp, title_vi)' : 'COALESCE(title_cn, title_vi)'} as title,
                sort_order
            FROM customer_slideshow_images
            WHERE is_active = true
            ORDER BY sort_order ASC
        `);

        // Get quick notes for all products
        const quickNotesResult = await query(`
            SELECT 
                product_id,
                json_agg(
                    json_build_object(
                        'id', id,
                        'label', ${lang === 'vi' ? 'label_vi' : lang === 'jp' ? 'COALESCE(label_jp, label_vi)' : 'COALESCE(label_cn, label_vi)'},
                        'price_modifier', price_modifier
                    ) ORDER BY sort_order
                ) as notes
            FROM product_quick_notes
            GROUP BY product_id
        `);

        const quickNotesMap: Record<string, any[]> = {};
        quickNotesResult.rows.forEach(row => {
            quickNotesMap[row.product_id] = row.notes;
        });

        // Get V3 settings (including branding)
        const settingsResult = await query(`
            SELECT key, value FROM settings 
            WHERE key LIKE 'customer_%' OR key LIKE 'brand_%'
        `);

        const settings: Record<string, any> = {};
        settingsResult.rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        });

        res.json({
            table,
            lang,
            categories: categoriesResult.rows,
            featured: featuredResult.rows,
            slideshow: slideshowResult.rows,
            quickNotes: quickNotesMap,
            settings
        });
    } catch (error) {
        console.error('Customer V3 menu error:', error);
        res.status(500).json({ error: 'Lỗi tải menu', details: (error as Error).message });
    }
});

/**
 * POST /api/customer/order
 * Create order from customer (public)
 */
customerRouter.post('/order', async (req, res) => {
    try {
        const { table_id, items, notes } = req.body;

        if (!items || items.length === 0) {
            res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 món' });
            return;
        }

        // Calculate total
        const productIds = items.map((item: { product_id: string }) => item.product_id);
        const productsResult = await query(
            'SELECT id, price FROM products WHERE id = ANY($1)',
            [productIds]
        );

        const priceMap = new Map<string, number>(productsResult.rows.map((p: { id: string; price: string }) => [p.id, parseFloat(p.price)]));

        let totalAmount = 0;
        for (const item of items) {
            const price = priceMap.get(item.product_id) || 0;
            totalAmount += price * item.quantity;
        }

        // Create order
        const orderResult = await query(
            `INSERT INTO orders (table_id, status, total, subtotal, note)
             VALUES ($1, 'open', $2, $2, $3)
             RETURNING id`,
            [table_id, totalAmount, notes || null]
        );

        const orderId = orderResult.rows[0].id;

        // Insert order items
        for (const item of items) {
            const price = priceMap.get(item.product_id) || 0;
            await query(
                `INSERT INTO order_items (order_id, product_id, quantity, unit_price, note)
                 VALUES ($1, $2, $3, $4, $5)`,
                [orderId, item.product_id, item.quantity, price, item.notes || null]
            );
        }

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('order:new', {
                order_id: orderId,
                table_id,
                from_customer: true
            });
        }

        res.json({
            success: true,
            order_id: orderId,
            message: 'Đã gửi đơn hàng!'
        });
    } catch (error) {
        console.error('Customer order error:', error);
        res.status(500).json({ error: 'Lỗi tạo đơn hàng', details: (error as Error).message });
    }
});

/**
 * POST /api/customer/call-service
 * Call staff for assistance (public)
 */
customerRouter.post('/call-service', async (req, res) => {
    try {
        const { table_id, type } = req.body;
        // type: 'service' | 'water' | 'bill'

        const tableResult = await query(
            'SELECT number FROM tables WHERE id = $1',
            [table_id]
        );

        if (tableResult.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy bàn' });
            return;
        }

        const tableNumber = tableResult.rows[0].number;

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('service:call', {
                table_id,
                table_number: tableNumber,
                type: type || 'service',
                urgent: type === 'bill'
            });
        }

        res.json({ success: true, message: 'Đã gọi nhân viên!' });
    } catch (error) {
        console.error('Service call error:', error);
        res.status(500).json({ error: 'Lỗi gọi nhân viên' });
    }
});

/**
 * GET /api/customer/order/:orderId/status
 * Check order status (public)
 */
customerRouter.get('/order/:orderId/status', async (req, res) => {
    try {
        const { orderId } = req.params;

        const result = await query(
            `SELECT id, status, total, created_at
             FROM orders WHERE id = $1`,
            [orderId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
            return;
        }

        res.json({ order: result.rows[0] });
    } catch (error) {
        console.error('Order status error:', error);
        res.status(500).json({ error: 'Lỗi kiểm tra đơn hàng' });
    }
});

export default customerRouter;
