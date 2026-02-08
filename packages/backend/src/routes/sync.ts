import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { AuthRequest } from '../middleware/auth.js';
import { Server as SocketIOServer } from 'socket.io';

const router: Router = Router();

// GET /api/sync/conflicts - Get all items in conflict status
router.get('/conflicts', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT q.*, t.number as table_number, t.name as table_name
            FROM offline_sync_queue q
            JOIN orders o ON (q.payload->>'table_id')::uuid = o.table_id
            LEFT JOIN tables t ON o.table_id = t.id
            WHERE q.status = 'conflict'
            ORDER BY q.created_at DESC
        `);

        // We need to fetch the current cloud orders for these tables to compare
        const conflicts = await Promise.all(result.rows.map(async (item) => {
            const tableId = item.payload.table_id;
            const { rows: cloudOrders } = await query(`
                SELECT o.*,
                    (SELECT json_agg(oi.*) FROM order_items oi WHERE oi.order_id = o.id) as items
                FROM orders o
                WHERE o.table_id = $1 AND o.status = 'open'
                ORDER BY o.created_at DESC LIMIT 1
            `, [tableId]);

            return {
                queue_id: item.id,
                local_id: item.local_id,
                table_number: item.table_number,
                local_order: item.payload,
                cloud_order: cloudOrders[0] || null
            };
        }));

        res.json({ success: true, data: { conflicts } });
    } catch (error) {
        next(error);
    }
});

// POST /api/sync/resolve - Resolve a conflict
router.post('/resolve', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { queue_id, decision } = req.body; // merge, keep_cloud, keep_local, cancel_all

        const { rows: items } = await query('SELECT * FROM offline_sync_queue WHERE id = $1', [queue_id]);
        if (items.length === 0) return res.status(404).json({ success: false, message: 'Queue item not found' });

        const item = items[0];
        const payload = item.payload;

        if (decision === 'merge' || decision === 'keep_local') {
            // Logic to create the local order or merge items
            // For now, let's just create the new order as a secondary one
            await query(`
                INSERT INTO orders (table_id, table_session_id, user_id, note, order_type)
                VALUES ($1, $2, $3, $4, $5)
            `, [payload.table_id || null, payload.table_session_id || null, req.user?.id, `Đã đối soát: ${payload.note || ''}`, payload.order_type]);
        }

        // Mark as resolved/synced
        await query(`
            UPDATE offline_sync_queue
            SET status = 'synced', synced_at = NOW()
            WHERE id = $1
        `, [queue_id]);

        res.json({ success: true, message: 'Conflict resolved successfully' });
    } catch (error) {
        next(error);
    }
});

export { router as syncRouter };
