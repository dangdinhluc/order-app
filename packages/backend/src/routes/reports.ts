import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/reports/sales - Sales report
router.get('/sales', requireRole('owner', 'cashier'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date, group_by = 'day' } = req.query;

        let dateFormat: string;
        switch (group_by) {
            case 'hour':
                dateFormat = 'YYYY-MM-DD HH24:00';
                break;
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }

        let sql = `
      SELECT 
        TO_CHAR(paid_at, '${dateFormat}') as period,
        COUNT(*) as order_count,
        SUM(subtotal) as gross_sales,
        SUM(discount_amount) as total_discounts,
        SUM(total) as net_sales,
        AVG(total) as avg_order_value
      FROM orders
      WHERE status = 'paid'
    `;

        const params: unknown[] = [];
        let paramCount = 1;

        if (start_date) {
            sql += ` AND paid_at >= $${paramCount++}`;
            params.push(start_date);
        }

        if (end_date) {
            sql += ` AND paid_at <= $${paramCount++}`;
            params.push(end_date);
        }

        sql += ` GROUP BY period ORDER BY period DESC`;

        const result = await query(sql, params);

        // Calculate totals
        const totals = result.rows.reduce((acc, row) => ({
            order_count: acc.order_count + parseInt(row.order_count),
            gross_sales: acc.gross_sales + parseFloat(row.gross_sales || 0),
            total_discounts: acc.total_discounts + parseFloat(row.total_discounts || 0),
            net_sales: acc.net_sales + parseFloat(row.net_sales || 0),
        }), { order_count: 0, gross_sales: 0, total_discounts: 0, net_sales: 0 });

        res.json({
            success: true,
            data: {
                periods: result.rows,
                totals,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/reports/products - Best selling products
router.get('/products', requireRole('owner', 'cashier'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date, limit = 20 } = req.query;

        let sql = `
      SELECT 
        COALESCE(p.id::text, oi.open_item_name) as product_id,
        COALESCE(p.name_vi, oi.open_item_name) as product_name,
        COALESCE(p.name_ja, oi.open_item_name) as product_name_ja,
        c.name_vi as category_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.unit_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.status = 'paid'
    `;

        const params: unknown[] = [];
        let paramCount = 1;

        if (start_date) {
            sql += ` AND o.paid_at >= $${paramCount++}`;
            params.push(start_date);
        }

        if (end_date) {
            sql += ` AND o.paid_at <= $${paramCount++}`;
            params.push(end_date);
        }

        sql += ` GROUP BY p.id, p.name_vi, p.name_ja, p.category_id, c.name_vi, oi.open_item_name
             ORDER BY total_quantity DESC
             LIMIT $${paramCount}`;
        params.push(limit);

        const result = await query(sql, params);

        res.json({
            success: true,
            data: { products: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/reports/hourly - Hourly breakdown
router.get('/hourly', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const result = await query(`
      SELECT 
        EXTRACT(HOUR FROM paid_at) as hour,
        COUNT(*) as order_count,
        SUM(total) as total_sales
      FROM orders
      WHERE status = 'paid'
        AND DATE(paid_at) = $1
      GROUP BY hour
      ORDER BY hour
    `, [targetDate]);

        res.json({
            success: true,
            data: { hourly: result.rows, date: targetDate },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/dashboard/summary - Real-time summary for Boss Mode
router.get('/dashboard/summary', requireRole('owner'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Today's stats
        const today = new Date().toISOString().split('T')[0];

        const [todaySales, activeOrders, occupiedTables, kitchenQueue] = await Promise.all([
            query(`
        SELECT 
          COUNT(*) as order_count,
          COALESCE(SUM(total), 0) as total_sales
        FROM orders
        WHERE status = 'paid' AND DATE(paid_at) = $1
      `, [today]),

            query(`
        SELECT COUNT(*) as count FROM orders WHERE status IN ('open', 'pending_payment')
      `),

            query(`
        SELECT COUNT(*) as count FROM tables WHERE status = 'occupied'
      `),

            query(`
        SELECT COUNT(*) as count 
        FROM order_items 
        WHERE display_in_kitchen = true 
          AND kitchen_status IN ('pending', 'preparing')
      `),
        ]);

        res.json({
            success: true,
            data: {
                today: {
                    order_count: parseInt(todaySales.rows[0].order_count),
                    total_sales: parseFloat(todaySales.rows[0].total_sales),
                },
                active_orders: parseInt(activeOrders.rows[0].count),
                occupied_tables: parseInt(occupiedTables.rows[0].count),
                kitchen_queue: parseInt(kitchenQueue.rows[0].count),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/reports/payments - Payment methods breakdown
router.get('/payments', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date } = req.query;

        let sql = `
            SELECT 
                p.method,
                COUNT(*) as transaction_count,
                SUM(p.amount) as total_amount
            FROM payments p
            JOIN orders o ON p.order_id = o.id
            WHERE o.status = 'paid'
        `;

        const params: unknown[] = [];
        let paramCount = 1;

        if (start_date) {
            sql += ` AND o.paid_at >= $${paramCount++}`;
            params.push(start_date);
        }

        if (end_date) {
            sql += ` AND o.paid_at <= $${paramCount++}`;
            params.push(end_date);
        }

        sql += ` GROUP BY p.method ORDER BY total_amount DESC`;

        const result = await query(sql, params);

        const methodNames: Record<string, string> = {
            cash: '現金 / Tiền mặt',
            card: 'カード / Thẻ',
            paypay: 'PayPay',
            linepay: 'LINE Pay',
            other: 'Khác',
        };

        const breakdown = result.rows.map(row => ({
            ...row,
            method_name: methodNames[row.method] || row.method,
            total_amount: parseFloat(row.total_amount),
        }));

        res.json({
            success: true,
            data: { breakdown },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/reports/staff - Staff performance report
router.get('/staff', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date } = req.query;

        let sql = `
            SELECT 
                u.id as user_id,
                u.name as staff_name,
                u.role,
                COUNT(DISTINCT o.id) as order_count,
                COALESCE(SUM(o.total), 0) as total_sales,
                COALESCE(SUM(o.discount_amount), 0) as total_discounts
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.status = 'paid'
        `;

        const params: unknown[] = [];
        let paramCount = 1;

        if (start_date) {
            sql += ` AND o.paid_at >= $${paramCount++}`;
            params.push(start_date);
        }

        if (end_date) {
            sql += ` AND o.paid_at <= $${paramCount++}`;
            params.push(end_date);
        }

        sql += ` GROUP BY u.id, u.name, u.role ORDER BY total_sales DESC`;

        const result = await query(sql, params);

        res.json({
            success: true,
            data: { staff: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/reports/tables - Table performance report
router.get('/tables', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date } = req.query;

        let sql = `
            SELECT 
                t.id,
                t.number as table_number,
                t.name as table_name,
                COUNT(DISTINCT o.id) as order_count,
                COALESCE(SUM(o.total), 0) as total_revenue,
                COALESCE(AVG(o.total), 0) as avg_order_value
            FROM tables t
            LEFT JOIN orders o ON t.id = o.table_id AND o.status = 'paid'
        `;

        const params: unknown[] = [];
        let paramCount = 1;

        if (start_date) {
            sql += ` AND o.paid_at >= $${paramCount++}`;
            params.push(start_date);
        }

        if (end_date) {
            sql += ` AND o.paid_at <= $${paramCount++}`;
            params.push(end_date);
        }

        sql += ` GROUP BY t.id, t.number, t.name ORDER BY total_revenue DESC`;

        const result = await query(sql, params);

        res.json({
            success: true,
            data: { tables: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

export { router as reportsRouter };
