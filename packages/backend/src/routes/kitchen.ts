import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();

// GET /api/kitchen/queue - Get items pending in kitchen
// Optional: ?station_id=uuid to filter by station
router.get('/queue', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { station_id } = req.query;

        let sql = `
      SELECT 
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.open_item_name,
        oi.quantity,
        oi.note,
        oi.kitchen_status,
        oi.kitchen_started_at,
        oi.created_at,
        p.name_vi as product_name_vi,
        p.name_ja as product_name_ja,
        p.name_en as product_name_en,
        o.table_id,
        o.order_type,
        t.number as table_number,
        t.name as table_name,
        o.created_at as order_created_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.display_in_kitchen = true
        AND oi.kitchen_status IN ('pending', 'preparing')
        AND o.status NOT IN ('cancelled', 'paid')
    `;

        const params: unknown[] = [];

        // Filter by station if provided
        if (station_id && typeof station_id === 'string') {
            sql += `
        AND (
          -- Product is assigned to this station
          EXISTS (SELECT 1 FROM product_stations ps WHERE ps.product_id = oi.product_id AND ps.station_id = $1)
          -- OR open items (no product) go to all stations
          OR oi.product_id IS NULL
        )
      `;
            params.push(station_id);
        }

        sql += `
      ORDER BY 
        CASE WHEN oi.kitchen_status = 'preparing' THEN 0 ELSE 1 END,
        oi.created_at ASC
    `;

        const result = await query(sql, params);

        // Group by product for smart sorting
        const grouped: Record<string, { product: string; items: typeof result.rows; total_qty: number }> = {};

        result.rows.forEach(item => {
            const productKey = item.product_id || item.open_item_name || 'unknown';
            if (!grouped[productKey]) {
                grouped[productKey] = {
                    product: item.product_name_vi || item.open_item_name || 'Unknown',
                    items: [],
                    total_qty: 0,
                };
            }
            grouped[productKey].items.push(item);
            grouped[productKey].total_qty += item.quantity;
        });

        res.json({
            success: true,
            data: {
                queue: result.rows,
                grouped: Object.values(grouped),
                total_items: result.rows.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/kitchen/history - Get served/completed items
router.get('/history', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
      SELECT 
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.open_item_name,
        oi.quantity,
        oi.note,
        oi.kitchen_status,
        oi.kitchen_started_at,
        oi.kitchen_ready_at,
        oi.created_at,
        p.name_vi as product_name_vi,
        p.name_ja as product_name_ja,
        t.number as table_number,
        t.name as table_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.display_in_kitchen = true
        AND oi.kitchen_status IN ('ready', 'served', 'cancelled')
        AND oi.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY oi.kitchen_ready_at DESC NULLS LAST, oi.created_at DESC
      LIMIT 100
    `);

        res.json({
            success: true,
            data: {
                history: result.rows,
            },
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/kitchen/items/:id/status - Update item status
router.patch('/items/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid status', code: 'INVALID_STATUS' },
            });
        }

        const updates: string[] = [`kitchen_status = $1`];
        const values: unknown[] = [status];

        if (status === 'preparing') {
            updates.push(`kitchen_started_at = NOW()`);
        } else if (status === 'ready') {
            updates.push(`kitchen_ready_at = NOW()`);
        }

        values.push(id);

        const result = await query(
            `UPDATE order_items SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: { message: 'Item not found', code: 'NOT_FOUND' },
            });
        }

        // Get table info for notification
        const orderInfo = await query(`
      SELECT o.table_id, t.number as table_number, t.name as table_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE oi.id = $1
    `, [id]);

        // Emit socket events
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('kitchen:status_changed', {
                itemId: id,
                status,
                item: result.rows[0],
            });

            // If ready, notify POS with sound
            if (status === 'ready' && orderInfo.rows.length > 0) {
                io.to('pos-room').emit('kitchen:item_ready', {
                    item: result.rows[0],
                    table_number: orderInfo.rows[0].table_number,
                    table_name: orderInfo.rows[0].table_name,
                });
            }
        }

        res.json({
            success: true,
            data: { item: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/kitchen/items/:id/ready - Quick mark as ready
router.post('/items/:id/ready', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await query(
            `UPDATE order_items 
       SET kitchen_status = 'ready', kitchen_ready_at = NOW()
       WHERE id = $1 AND display_in_kitchen = true
       RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: { message: 'Item not found', code: 'NOT_FOUND' },
            });
        }

        // Get table info
        const orderInfo = await query(`
      SELECT t.number as table_number, t.name as table_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE oi.id = $1
    `, [id]);

        // Emit to POS
        const io: SocketIOServer = req.app.get('io');
        if (io && orderInfo.rows.length > 0) {
            io.to('pos-room').emit('kitchen:item_ready', {
                item: result.rows[0],
                table_number: orderInfo.rows[0].table_number,
                table_name: orderInfo.rows[0].table_name,
                play_sound: true,
            });
        }

        res.json({
            success: true,
            data: { item: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/kitchen/products/:id/sold-out - Mark product as sold out
router.post(
    '/products/:id/sold-out',
    requireRole('kitchen', 'owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { is_available = false } = req.body;

            const result = await query(
                'UPDATE products SET is_available = $1 WHERE id = $2 RETURNING *',
                [is_available, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Product not found', code: 'NOT_FOUND' },
                });
            }

            // Emit to all clients (POS, Client App)
            const io: SocketIOServer = req.app.get('io');
            if (io) {
                io.emit('product:sold_out', {
                    productId: id,
                    is_available,
                    product: result.rows[0],
                });
            }

            res.json({
                success: true,
                data: { product: result.rows[0] },
            });
        } catch (error) {
            next(error);
        }
    }
);

export { router as kitchenRouter };
