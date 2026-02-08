import { Router } from 'express';
import pool from '../db/pool';

const router: Router = Router();

// Get menu engineering analysis
router.get('/analysis', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        // Default to last 30 days
        const endDate = end_date ? new Date(end_date as string) : new Date();
        const startDate = start_date
            ? new Date(start_date as string)
            : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get sales data with product info
        const result = await pool.query(`
            WITH sales_data AS (
                SELECT 
                    p.id as product_id,
                    p.name_vi,
                    p.name_ja,
                    p.price,
                    COALESCE(p.cost_price, 0) as cost_price,
                    c.name as category_name,
                    COALESCE(SUM(oi.quantity), 0) as quantity_sold,
                    COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
                    COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN order_items oi ON oi.product_id = p.id
                LEFT JOIN orders o ON oi.order_id = o.id 
                    AND o.status = 'paid'
                    AND o.created_at >= $1 
                    AND o.created_at <= $2
                WHERE p.is_available = true
                GROUP BY p.id, p.name_vi, p.name_ja, p.price, p.cost_price, c.name
            ),
            averages AS (
                SELECT 
                    AVG(quantity_sold) as avg_quantity,
                    AVG(CASE WHEN revenue > 0 THEN (revenue - total_cost) / revenue * 100 ELSE 0 END) as avg_margin
                FROM sales_data
                WHERE quantity_sold > 0
            )
            SELECT 
                sd.*,
                sd.revenue - sd.total_cost as profit,
                CASE 
                    WHEN sd.revenue > 0 THEN ROUND((sd.revenue - sd.total_cost) / sd.revenue * 100, 2)
                    ELSE 0 
                END as profit_margin,
                CASE 
                    WHEN a.avg_quantity > 0 THEN ROUND(sd.quantity_sold / a.avg_quantity * 100, 2)
                    ELSE 0 
                END as popularity_index,
                CASE
                    WHEN sd.quantity_sold >= COALESCE(a.avg_quantity, 0) AND 
                         (sd.revenue - sd.total_cost) / NULLIF(sd.revenue, 0) * 100 >= COALESCE(a.avg_margin, 0)
                    THEN 'star'
                    WHEN sd.quantity_sold >= COALESCE(a.avg_quantity, 0) AND 
                         (sd.revenue - sd.total_cost) / NULLIF(sd.revenue, 0) * 100 < COALESCE(a.avg_margin, 0)
                    THEN 'workhorse'
                    WHEN sd.quantity_sold < COALESCE(a.avg_quantity, 0) AND 
                         (sd.revenue - sd.total_cost) / NULLIF(sd.revenue, 0) * 100 >= COALESCE(a.avg_margin, 0)
                    THEN 'puzzle'
                    ELSE 'dog'
                END as category
            FROM sales_data sd
            CROSS JOIN averages a
            ORDER BY sd.quantity_sold DESC
        `, [startDate, endDate]);

        // Calculate summary
        const products = result.rows;
        const summary = {
            totalRevenue: products.reduce((sum, p) => sum + Number(p.revenue), 0),
            totalCost: products.reduce((sum, p) => sum + Number(p.total_cost), 0),
            totalProfit: products.reduce((sum, p) => sum + Number(p.profit), 0),
            avgMargin: products.filter(p => p.revenue > 0).length > 0
                ? products.filter(p => p.revenue > 0)
                    .reduce((sum, p) => sum + Number(p.profit_margin), 0) /
                products.filter(p => p.revenue > 0).length
                : 0,
            starCount: products.filter(p => p.category === 'star').length,
            workhorseCount: products.filter(p => p.category === 'workhorse').length,
            puzzleCount: products.filter(p => p.category === 'puzzle').length,
            dogCount: products.filter(p => p.category === 'dog').length,
        };

        res.json({
            success: true,
            data: {
                period: { start: startDate, end: endDate },
                summary,
                products,
            }
        });
    } catch (error) {
        console.error('Error getting menu analysis:', error);
        res.status(500).json({ success: false, error: 'Failed to get analysis' });
    }
});

// Update product cost price
router.put('/products/:id/cost', async (req, res) => {
    try {
        const { id } = req.params;
        const { cost_price } = req.body;

        if (cost_price === undefined || cost_price < 0) {
            return res.status(400).json({ success: false, error: 'Invalid cost price' });
        }

        const result = await pool.query(
            'UPDATE products SET cost_price = $1 WHERE id = $2 RETURNING *',
            [cost_price, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating cost price:', error);
        res.status(500).json({ success: false, error: 'Failed to update cost' });
    }
});

// Bulk update cost prices
router.put('/products/bulk-cost', async (req, res) => {
    try {
        const { updates } = req.body; // Array of { product_id, cost_price }

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid updates array' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const update of updates) {
                if (update.cost_price >= 0) {
                    await client.query(
                        'UPDATE products SET cost_price = $1 WHERE id = $2',
                        [update.cost_price, update.product_id]
                    );
                }
            }

            await client.query('COMMIT');
            res.json({ success: true, updated: updates.length });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error bulk updating costs:', error);
        res.status(500).json({ success: false, error: 'Failed to update costs' });
    }
});

// Get matrix data for chart
router.get('/matrix', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const endDate = end_date ? new Date(end_date as string) : new Date();
        const startDate = start_date
            ? new Date(start_date as string)
            : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        const result = await pool.query(`
            WITH sales_data AS (
                SELECT 
                    p.id,
                    p.name_vi,
                    COALESCE(SUM(oi.quantity), 0) as quantity_sold,
                    COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
                    COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost
                FROM products p
                LEFT JOIN order_items oi ON oi.product_id = p.id
                LEFT JOIN orders o ON oi.order_id = o.id 
                    AND o.status = 'paid'
                    AND o.created_at >= $1 
                    AND o.created_at <= $2
                WHERE p.is_available = true
                GROUP BY p.id, p.name_vi
            )
            SELECT 
                id,
                name_vi,
                quantity_sold,
                CASE 
                    WHEN revenue > 0 THEN ROUND((revenue - total_cost) / revenue * 100, 2)
                    ELSE 0 
                END as profit_margin
            FROM sales_data
            WHERE quantity_sold > 0
        `, [startDate, endDate]);

        // Calculate averages for quadrant lines
        const data = result.rows;
        const avgQuantity = data.length > 0
            ? data.reduce((sum, d) => sum + Number(d.quantity_sold), 0) / data.length
            : 0;
        const avgMargin = data.length > 0
            ? data.reduce((sum, d) => sum + Number(d.profit_margin), 0) / data.length
            : 0;

        res.json({
            success: true,
            data: {
                points: data.map(d => ({
                    id: d.id,
                    name: d.name_vi,
                    x: Number(d.quantity_sold), // Popularity
                    y: Number(d.profit_margin), // Profitability
                })),
                averages: {
                    quantity: avgQuantity,
                    margin: avgMargin,
                }
            }
        });
    } catch (error) {
        console.error('Error getting matrix data:', error);
        res.status(500).json({ success: false, error: 'Failed to get matrix' });
    }
});

export default router;
