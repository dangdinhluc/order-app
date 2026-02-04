import { Router } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = Router();

/**
 * POST /api/admin/reset-database
 * DANGER: Reset entire database to default state
 * Only owner can do this
 */
router.post('/reset-database', requireRole('owner'), async (req: AuthRequest, res) => {
    try {
        console.log('⚠️  DATABASE RESET REQUESTED by user:', req.user?.username);

        // Delete all data in reverse dependency order
        await query('DELETE FROM kitchen_ticket_items');
        await query('DELETE FROM kitchen_tickets');
        await query('DELETE FROM order_items');
        await query('DELETE FROM orders');
        await query('DELETE FROM table_sessions');
        await query("UPDATE tables SET status = 'available' WHERE status = 'occupied'");

        // Optionally delete products, categories, etc. (keep structure, delete data)
        // await query('DELETE FROM product_options');
        // await query('DELETE FROM products');
        // await query('DELETE FROM categories');

        console.log('✅ Database reset completed');

        res.json({
            success: true,
            message: 'Database reset successfully. All orders and sessions have been cleared.'
        });
    } catch (error) {
        console.error('❌ Database reset failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset database'
        });
    }
});

/**
 * GET /api/admin/backup
 * Export all database data as JSON
 */
router.get('/backup', requireRole('owner'), async (req: AuthRequest, res) => {
    try {
        console.log('📦 Database backup requested by:', req.user?.name);

        // Export all tables
        const backup: any = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {}
        };

        // Products & Categories
        const categories = await query('SELECT * FROM categories').catch(() => ({ rows: [] }));
        const products = await query('SELECT * FROM products').catch(() => ({ rows: [] }));
        const productOptions = await query('SELECT * FROM product_options').catch(() => ({ rows: [] }));

        // Tables & Areas
        const areas = await query('SELECT * FROM areas').catch(() => ({ rows: [] }));
        const tables = await query('SELECT * FROM tables').catch(() => ({ rows: [] }));

        // Orders & Items (optional - might be large)
        const orders = await query('SELECT * FROM orders').catch(() => ({ rows: [] }));
        const orderItems = await query('SELECT * FROM order_items').catch(() => ({ rows: [] }));
        const tableSessions = await query('SELECT * FROM table_sessions').catch(() => ({ rows: [] }));
        const kitchenTickets = await query('SELECT * FROM kitchen_tickets').catch(() => ({ rows: [] }));
        const kitchenTicketItems = await query('SELECT * FROM kitchen_ticket_items').catch(() => ({ rows: [] }));

        // Settings
        const settings = await query('SELECT * FROM settings').catch(() => ({ rows: [] }));
        const paymentMethods = await query('SELECT * FROM payment_methods').catch(() => ({ rows: [] }));
        const stations = await query('SELECT * FROM stations').catch(() => ({ rows: [] }));

        // Users (excluding passwords)
        const users = await query('SELECT id, email, role, name, created_at, updated_at FROM users').catch(() => ({ rows: [] }));

        backup.data = {
            categories: categories.rows,
            products: products.rows,
            product_options: productOptions.rows,
            areas: areas.rows,
            tables: tables.rows,
            orders: orders.rows,
            order_items: orderItems.rows,
            table_sessions: tableSessions.rows,
            kitchen_tickets: kitchenTickets.rows,
            kitchen_ticket_items: kitchenTicketItems.rows,
            settings: settings.rows,
            payment_methods: paymentMethods.rows,
            stations: stations.rows,
            users: users.rows
        };

        const filename = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(backup, null, 2));

        console.log('✅ Backup completed:', filename);
    } catch (error) {
        console.error('❌ Backup failed:', error);
        res.status(500).json({ success: false, error: 'Failed to create backup' });
    }
});

/**
 * POST /api/admin/import
 * Import database data from JSON backup
 */
router.post('/import', requireRole('owner'), async (req: AuthRequest, res) => {
    try {
        console.log('📥 Database import requested by:', req.user?.name);

        const backup = req.body;

        if (!backup || !backup.data) {
            throw new Error('Invalid backup file format');
        }

        // Start transaction (manual for better control)
        await query('BEGIN');

        try {
            // Clear existing data first (in dependency order)
            await query('DELETE FROM kitchen_ticket_items');
            await query('DELETE FROM kitchen_tickets');
            await query('DELETE FROM order_items');
            await query('DELETE FROM orders');
            await query('DELETE FROM table_sessions');
            await query('DELETE FROM product_options');
            await query('DELETE FROM products');
            await query('DELETE FROM categories');
            await query('DELETE FROM tables');
            await query('DELETE FROM areas');
            await query('DELETE FROM stations');
            await query('DELETE FROM payment_methods');
            await query('DELETE FROM settings WHERE key != $1', ['system_version']); // Keep system version

            // Import data (in dependency order)
            // Categories first
            if (backup.data.categories) {
                for (const cat of backup.data.categories) {
                    await query(
                        `INSERT INTO categories (id, name_vi, name_ja, sort_order, is_active, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         ON CONFLICT (id) DO NOTHING`,
                        [cat.id, cat.name_vi, cat.name_ja, cat.sort_order, cat.is_active, cat.created_at, cat.updated_at]
                    );
                }
            }

            // Products
            if (backup.data.products) {
                for (const prod of backup.data.products) {
                    await query(
                        `INSERT INTO products (id, category_id, name_vi, name_ja, price, image_url, is_available, sort_order, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                         ON CONFLICT (id) DO NOTHING`,
                        [prod.id, prod.category_id, prod.name_vi, prod.name_ja, prod.price, prod.image_url, prod.is_available, prod.sort_order, prod.created_at, prod.updated_at]
                    );
                }
            }

            // Product Options
            if (backup.data.product_options) {
                for (const opt of backup.data.product_options) {
                    await query(
                        `INSERT INTO product_options (id, product_id, option_type, name, price_modifier, is_default, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         ON CONFLICT (id) DO NOTHING`,
                        [opt.id, opt.product_id, opt.option_type, opt.name, opt.price_modifier, opt.is_default, opt.created_at]
                    );
                }
            }

            // Areas & Tables
            if (backup.data.areas) {
                for (const area of backup.data.areas) {
                    await query(
                        `INSERT INTO areas (id, name, sort_order, created_at)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (id) DO NOTHING`,
                        [area.id, area.name, area.sort_order, area.created_at]
                    );
                }
            }

            if (backup.data.tables) {
                for (const table of backup.data.tables) {
                    await query(
                        `INSERT INTO tables (id, number, name, capacity, status, area_id, position_x, position_y, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                         ON CONFLICT (id) DO NOTHING`,
                        [table.id, table.number, table.name, table.capacity, table.status, table.area_id, table.position_x, table.position_y, table.created_at]
                    );
                }
            }

            // Settings, Payment Methods, Stations
            if (backup.data.settings) {
                for (const setting of backup.data.settings) {
                    await query(
                        `INSERT INTO settings (key, value, updated_at)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3`,
                        [setting.key, setting.value, setting.updated_at]
                    );
                }
            }

            if (backup.data.payment_methods) {
                for (const pm of backup.data.payment_methods) {
                    await query(
                        `INSERT INTO payment_methods (id, name, is_active, sort_order)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (id) DO NOTHING`,
                        [pm.id, pm.name, pm.is_active, pm.sort_order]
                    );
                }
            }

            if (backup.data.stations) {
                for (const station of backup.data.stations) {
                    await query(
                        `INSERT INTO stations (id, name, type, is_active, printer_config, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         ON CONFLICT (id) DO NOTHING`,
                        [station.id, station.name, station.type, station.is_active, station.printer_config, station.created_at, station.updated_at]
                    );
                }
            }

            // Commit transaction
            await query('COMMIT');

            console.log('✅ Import completed successfully');
            res.json({ success: true, message: 'Database imported successfully' });
        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }
    } catch (error: any) {
        console.error('❌ Import failed:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to import backup' });
    }
});

export { router as adminRouter };
