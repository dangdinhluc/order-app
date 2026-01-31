import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { Server as SocketIOServer } from 'socket.io';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const createTableSchema = z.object({
    number: z.number().int().positive(),
    name: z.string().max(50).optional(),
    capacity: z.number().int().positive().default(4),
    position_x: z.number().int().optional(),
    position_y: z.number().int().optional(),
    area_id: z.string().uuid().optional(),
});

const updateTableSchema = z.object({
    number: z.number().int().positive().optional(),
    name: z.string().max(50).optional(),
    capacity: z.number().int().positive().optional(),
    position_x: z.number().int().optional(),
    position_y: z.number().int().optional(),
    area_id: z.string().uuid().optional(),
});

// GET /api/tables - List all tables with current status
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
      SELECT 
        t.*,
        ts.id as session_id,
        ts.session_token,
        ts.started_at as session_started_at,
        ts.customer_count,
        o.id as current_order_id,
        o.total as current_order_total,
        o.status as current_order_status
      FROM tables t
      LEFT JOIN table_sessions ts ON t.id = ts.table_id AND ts.ended_at IS NULL
      LEFT JOIN orders o ON ts.id = o.table_session_id AND o.status IN ('open', 'pending_payment')
      ORDER BY t.number ASC
    `);

        res.json({
            success: true,
            data: { tables: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/tables/:id - Get single table with session info
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT 
        t.*,
        ts.id as session_id,
        ts.session_token,
        ts.started_at as session_started_at,
        ts.customer_count
      FROM tables t
      LEFT JOIN table_sessions ts ON t.id = ts.table_id AND ts.ended_at IS NULL
      WHERE t.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            throw new ApiError('Table not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            data: { table: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/tables/:id/open - Open table (create session with token)
router.post('/:id/open', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { customer_count = 1 } = req.body;

        // Check if table exists
        const tableResult = await query('SELECT * FROM tables WHERE id = $1', [id]);
        if (tableResult.rows.length === 0) {
            throw new ApiError('Table not found', 404, 'NOT_FOUND');
        }

        // Check if table already has active session
        const existingSession = await query(
            'SELECT id FROM table_sessions WHERE table_id = $1 AND ended_at IS NULL',
            [id]
        );
        if (existingSession.rows.length > 0) {
            throw new ApiError('Table already has an active session', 400, 'SESSION_EXISTS');
        }

        // Generate secure session token for QR
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Create session
        const sessionResult = await query(
            `INSERT INTO table_sessions (table_id, session_token, customer_count)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [id, sessionToken, customer_count]
        );

        // Update table status
        await query(
            `UPDATE tables SET status = 'occupied' WHERE id = $1`,
            [id]
        );

        // Emit socket event
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('table:opened', {
                table_id: id,
                session: sessionResult.rows[0],
            });
        }

        res.status(201).json({
            success: true,
            data: {
                session: sessionResult.rows[0],
                qr_token: sessionToken,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/tables/:id/close - Close table (end session)
router.post('/:id/close', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Find active session
        const sessionResult = await query(
            'SELECT id FROM table_sessions WHERE table_id = $1 AND ended_at IS NULL',
            [id]
        );

        if (sessionResult.rows.length === 0) {
            throw new ApiError('No active session for this table', 400, 'NO_SESSION');
        }

        // Check for unpaid orders
        const unpaidOrders = await query(
            `SELECT id FROM orders WHERE table_session_id = $1 AND status NOT IN ('paid', 'cancelled')`,
            [sessionResult.rows[0].id]
        );

        if (unpaidOrders.rows.length > 0) {
            throw new ApiError('Table has unpaid orders', 400, 'UNPAID_ORDERS');
        }

        // End session
        await query(
            'UPDATE table_sessions SET ended_at = NOW() WHERE id = $1',
            [sessionResult.rows[0].id]
        );

        // Update table status
        await query(
            `UPDATE tables SET status = 'available' WHERE id = $1`,
            [id]
        );

        // Emit socket event
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('table:closed', { table_id: id });
        }

        res.json({
            success: true,
            message: 'Table closed',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/tables/:id/transfer - Transfer order to another table
router.post('/:id/transfer', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id: fromTableId } = req.params;
        const { to_table_id } = req.body;

        if (!to_table_id) {
            throw new ApiError('Target table ID required', 400, 'INVALID_REQUEST');
        }

        // Get current session and order
        const fromSession = await query(
            'SELECT * FROM table_sessions WHERE table_id = $1 AND ended_at IS NULL',
            [fromTableId]
        );

        if (fromSession.rows.length === 0) {
            throw new ApiError('Source table has no active session', 400, 'NO_SESSION');
        }

        // Check target table is available
        const toTable = await query(
            'SELECT * FROM tables WHERE id = $1',
            [to_table_id]
        );

        if (toTable.rows.length === 0) {
            throw new ApiError('Target table not found', 404, 'NOT_FOUND');
        }

        const existingTargetSession = await query(
            'SELECT id FROM table_sessions WHERE table_id = $1 AND ended_at IS NULL',
            [to_table_id]
        );

        if (existingTargetSession.rows.length > 0) {
            throw new ApiError('Target table is occupied', 400, 'TABLE_OCCUPIED');
        }

        // Generate new token for new table
        const newToken = crypto.randomBytes(32).toString('hex');

        // Update session to new table
        await query(
            `UPDATE table_sessions 
       SET table_id = $1, session_token = $2 
       WHERE id = $3`,
            [to_table_id, newToken, fromSession.rows[0].id]
        );

        // Update orders
        await query(
            `UPDATE orders SET table_id = $1 WHERE table_session_id = $2`,
            [to_table_id, fromSession.rows[0].id]
        );

        // Update table statuses
        await query(`UPDATE tables SET status = 'available' WHERE id = $1`, [fromTableId]);
        await query(`UPDATE tables SET status = 'occupied' WHERE id = $1`, [to_table_id]);

        // Emit socket events
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('table:transferred', {
                from_table_id: fromTableId,
                to_table_id,
                new_token: newToken,
            });
        }

        res.json({
            success: true,
            message: 'Table transferred',
            data: { new_token: newToken },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/tables/:id/merge - Merge another table into this one
router.post('/:id/merge', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id: targetTableId } = req.params;
        const { from_table_id } = req.body;

        if (!from_table_id) {
            throw new ApiError('Source table ID required', 400, 'INVALID_REQUEST');
        }

        // Get both sessions
        const targetSession = await query(
            'SELECT * FROM table_sessions WHERE table_id = $1 AND ended_at IS NULL',
            [targetTableId]
        );

        const sourceSession = await query(
            'SELECT * FROM table_sessions WHERE table_id = $1 AND ended_at IS NULL',
            [from_table_id]
        );

        if (targetSession.rows.length === 0) {
            throw new ApiError('Target table has no active session', 400, 'NO_SESSION');
        }

        if (sourceSession.rows.length === 0) {
            throw new ApiError('Source table has no active session', 400, 'NO_SESSION');
        }

        // Move all orders from source session to target session
        await query(
            `UPDATE orders 
             SET table_id = $1, table_session_id = $2 
             WHERE table_session_id = $3`,
            [targetTableId, targetSession.rows[0].id, sourceSession.rows[0].id]
        );

        // Update customer count on target session
        await query(
            `UPDATE table_sessions 
             SET customer_count = customer_count + $1 
             WHERE id = $2`,
            [sourceSession.rows[0].customer_count || 0, targetSession.rows[0].id]
        );

        // Close source session
        await query(
            'UPDATE table_sessions SET ended_at = NOW() WHERE id = $1',
            [sourceSession.rows[0].id]
        );

        // Update source table status
        await query(
            `UPDATE tables SET status = 'available' WHERE id = $1`,
            [from_table_id]
        );

        // Emit socket events
        const io: SocketIOServer = req.app.get('io');
        if (io) {
            io.emit('table:merged', {
                target_table_id: targetTableId,
                from_table_id,
            });
            io.emit('table:closed', { table_id: from_table_id });
        }

        res.json({
            success: true,
            message: 'Tables merged successfully',
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/tables/:id/qr - Get QR code data for table session
router.get('/:id/qr', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT ts.session_token, t.number as table_number
       FROM table_sessions ts
       JOIN tables t ON ts.table_id = t.id
       WHERE ts.table_id = $1 AND ts.ended_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new ApiError('No active session for this table', 404, 'NO_SESSION');
        }

        const { session_token, table_number } = result.rows[0];
        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const qrUrl = `${baseUrl}/order?token=${session_token}&table=${table_number}`;

        res.json({
            success: true,
            data: {
                qr_url: qrUrl,
                token: session_token,
                table_number,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/tables - Create new table (owner only)
router.post(
    '/',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = createTableSchema.parse(req.body);

            const result = await query(
                `INSERT INTO tables (number, name, capacity, position_x, position_y, area_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [data.number, data.name || `Bàn ${data.number}`, data.capacity, data.position_x || 0, data.position_y || 0, data.area_id]
            );

            res.status(201).json({
                success: true,
                data: { table: result.rows[0] },
            });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/tables/:id - Update table (owner only)
router.put('/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateTableSchema.parse(req.body);

        // Build dynamic update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.number) { updates.push(`number = $${paramCount++}`); values.push(data.number); }
        if (data.name) { updates.push(`name = $${paramCount++}`); values.push(data.name); }
        if (data.capacity) { updates.push(`capacity = $${paramCount++}`); values.push(data.capacity); }
        if (data.position_x !== undefined) { updates.push(`position_x = $${paramCount++}`); values.push(data.position_x); }
        if (data.position_y !== undefined) { updates.push(`position_y = $${paramCount++}`); values.push(data.position_y); }
        if (data.area_id !== undefined) { updates.push(`area_id = $${paramCount++}`); values.push(data.area_id); }

        if (updates.length === 0) {
            res.json({ success: true, message: 'No changes' });
            return;
        }

        values.push(id);
        const result = await query(
            `UPDATE tables SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: 'Table not found' });
            return;
        }

        res.json({ success: true, data: { table: result.rows[0] } });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/tables/:id - Delete table (owner only)
router.delete('/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Check active session
        const sessionCheck = await query(`SELECT id FROM table_sessions WHERE table_id = $1 AND ended_at IS NULL`, [id]);
        if (sessionCheck.rows.length > 0) {
            res.status(400).json({ success: false, message: 'Cannot delete table with active session' });
            return;
        }

        // Check if table has any historical sessions/orders (soft delete? or hard delete but cascade?)
        // For now, strict check: if orders exist, maybe just disable? Or allow delete if we don't care about history integrity for deleted tables.
        // Let's check foreign keys. orders->table_sessions->tables. orders->tables.
        // If we delete table, we break history.
        // Better: soft delete `is_active = false`. But schema doesn't have `is_active`.
        // For now restrict delete if orders exist.

        const orderCheck = await query(`SELECT id FROM orders WHERE table_id = $1 LIMIT 1`, [id]);
        if (orderCheck.rows.length > 0) {
            res.status(400).json({ success: false, message: 'Cannot delete table with order history. Consider hiding it instead.' });
            // TODO: Add is_active to tables later if needed
            return;
        }

        const result = await query(`DELETE FROM tables WHERE id = $1 RETURNING id`, [id]);
        if (result.rowCount === 0) {
            res.status(404).json({ success: false, message: 'Table not found' });
            return;
        }

        res.json({ success: true, message: 'Table deleted' });
    } catch (error) {
        next(error);
    }
});

export { router as tablesRouter };
