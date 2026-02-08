import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';

const router: Router = Router();

// ============ SHIFT TYPES ============

// GET /api/scheduling/shift-types - Get all shift types
router.get('/shift-types', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(
            'SELECT * FROM shift_types WHERE is_active = true ORDER BY start_time'
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/scheduling/shift-types - Create shift type (owner only)
router.post('/shift-types', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            name: z.string().min(1).max(50),
            start_time: z.string().regex(/^\d{2}:\d{2}$/),
            end_time: z.string().regex(/^\d{2}:\d{2}$/),
            color: z.string().optional()
        });
        const data = schema.parse(req.body);

        const result = await query(
            `INSERT INTO shift_types (name, start_time, end_time, color)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [data.name, data.start_time, data.end_time, data.color || '#3B82F6']
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// PUT /api/scheduling/shift-types/:id - Update shift type
router.put('/shift-types/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const schema = z.object({
            name: z.string().min(1).max(50).optional(),
            start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
            end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
            color: z.string().optional(),
            is_active: z.boolean().optional()
        });
        const data = schema.parse(req.body);

        const result = await query(
            `UPDATE shift_types SET
                name = COALESCE($1, name),
                start_time = COALESCE($2, start_time),
                end_time = COALESCE($3, end_time),
                color = COALESCE($4, color),
                is_active = COALESCE($5, is_active)
             WHERE id = $6
             RETURNING *`,
            [data.name, data.start_time, data.end_time, data.color, data.is_active, id]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Shift type not found', 404);
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ============ SCHEDULES ============

// GET /api/scheduling/schedules - Get schedules for a date range
router.get('/schedules', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date, user_id } = req.query;

        let sql = `
            SELECT 
                s.*,
                u.name as user_name,
                u.email as user_email,
                st.name as shift_name,
                st.start_time,
                st.end_time,
                st.color as shift_color
            FROM schedules s
            JOIN users u ON s.user_id = u.id
            JOIN shift_types st ON s.shift_type_id = st.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (start_date) {
            sql += ` AND s.work_date >= $${paramCount++}`;
            params.push(start_date);
        }
        if (end_date) {
            sql += ` AND s.work_date <= $${paramCount++}`;
            params.push(end_date);
        }
        if (user_id) {
            sql += ` AND s.user_id = $${paramCount++}`;
            params.push(user_id);
        }

        sql += ' ORDER BY s.work_date, st.start_time';

        const result = await query(sql, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/scheduling/schedules - Create schedule
router.post('/schedules', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            user_id: z.string().uuid(),
            shift_type_id: z.string().uuid(),
            work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            note: z.string().optional()
        });
        const data = schema.parse(req.body);

        const result = await query(
            `INSERT INTO schedules (user_id, shift_type_id, work_date, note, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [data.user_id, data.shift_type_id, data.work_date, data.note, req.user?.id]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            next(new ApiError('Schedule already exists for this user/date/shift', 409));
        } else {
            next(error);
        }
    }
});

// POST /api/scheduling/schedules/bulk - Create multiple schedules at once
router.post('/schedules/bulk', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            schedules: z.array(z.object({
                user_id: z.string().uuid(),
                shift_type_id: z.string().uuid(),
                work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                note: z.string().optional()
            }))
        });
        const { schedules } = schema.parse(req.body);

        const created = [];
        for (const s of schedules) {
            try {
                const result = await query(
                    `INSERT INTO schedules (user_id, shift_type_id, work_date, note, created_by)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (user_id, work_date, shift_type_id) DO NOTHING
                     RETURNING *`,
                    [s.user_id, s.shift_type_id, s.work_date, s.note, req.user?.id]
                );
                if (result.rows.length > 0) {
                    created.push(result.rows[0]);
                }
            } catch (e) {
                // Skip duplicates silently
            }
        }

        res.status(201).json({ success: true, data: created, count: created.length });
    } catch (error) {
        next(error);
    }
});

// PUT /api/scheduling/schedules/:id - Update schedule status
router.put('/schedules/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const schema = z.object({
            status: z.enum(['scheduled', 'confirmed', 'completed', 'absent', 'cancelled']).optional(),
            note: z.string().optional()
        });
        const data = schema.parse(req.body);

        const result = await query(
            `UPDATE schedules SET
                status = COALESCE($1, status),
                note = COALESCE($2, note),
                updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [data.status, data.note, id]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Schedule not found', 404);
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/scheduling/schedules/:id - Delete schedule
router.delete('/schedules/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM schedules WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            throw new ApiError('Schedule not found', 404);
        }

        res.json({ success: true, message: 'Schedule deleted' });
    } catch (error) {
        next(error);
    }
});

// ============ TIME CLOCK ============

// GET /api/scheduling/time-clock/current - Get current clock status for user
router.get('/time-clock/current', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        const result = await query(
            `SELECT * FROM time_clock 
             WHERE user_id = $1 AND clock_out IS NULL
             ORDER BY clock_in DESC LIMIT 1`,
            [userId]
        );

        res.json({
            success: true,
            data: result.rows[0] || null,
            is_clocked_in: result.rows.length > 0
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/scheduling/time-clock/in - Clock in
router.post('/time-clock/in', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { schedule_id, note } = req.body;

        // Check if already clocked in
        const existing = await query(
            'SELECT id FROM time_clock WHERE user_id = $1 AND clock_out IS NULL',
            [userId]
        );

        if (existing.rows.length > 0) {
            throw new ApiError('Already clocked in', 400);
        }

        const result = await query(
            `INSERT INTO time_clock (user_id, schedule_id, clock_in, note)
             VALUES ($1, $2, NOW(), $3)
             RETURNING *`,
            [userId, schedule_id || null, note || null]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// POST /api/scheduling/time-clock/out - Clock out
router.post('/time-clock/out', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { break_minutes, note } = req.body;

        // Get active clock entry
        const activeResult = await query(
            'SELECT * FROM time_clock WHERE user_id = $1 AND clock_out IS NULL',
            [userId]
        );

        if (activeResult.rows.length === 0) {
            throw new ApiError('Not clocked in', 400);
        }

        const clockEntry = activeResult.rows[0];
        const breakMins = break_minutes || 0;

        // Calculate total hours
        const result = await query(
            `UPDATE time_clock SET
                clock_out = NOW(),
                break_minutes = $1,
                total_hours = EXTRACT(EPOCH FROM (NOW() - clock_in)) / 3600 - ($2::numeric / 60),
                note = COALESCE($3, note)
             WHERE id = $4
             RETURNING *`,
            [breakMins, breakMins, note, clockEntry.id]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// GET /api/scheduling/time-clock/history - Get time clock history
router.get('/time-clock/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user_id, start_date, end_date, limit = 50 } = req.query;

        let sql = `
            SELECT 
                tc.*,
                u.name as user_name
            FROM time_clock tc
            JOIN users u ON tc.user_id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (user_id) {
            sql += ` AND tc.user_id = $${paramCount++}`;
            params.push(user_id);
        }
        if (start_date) {
            sql += ` AND DATE(tc.clock_in) >= $${paramCount++}`;
            params.push(start_date);
        }
        if (end_date) {
            sql += ` AND DATE(tc.clock_in) <= $${paramCount++}`;
            params.push(end_date);
        }

        sql += ` ORDER BY tc.clock_in DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await query(sql, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

// GET /api/scheduling/staff/:id/hours - Get total hours for a staff member
router.get('/staff/:id/hours', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { start_date, end_date } = req.query;

        let sql = `
            SELECT 
                u.id,
                u.name,
                COUNT(tc.id) as total_shifts,
                COALESCE(SUM(tc.total_hours), 0) as total_hours,
                COALESCE(SUM(tc.overtime_hours), 0) as overtime_hours
            FROM users u
            LEFT JOIN time_clock tc ON u.id = tc.user_id
        `;

        const params: any[] = [id];
        let paramCount = 2;

        if (start_date) {
            sql += ` AND DATE(tc.clock_in) >= $${paramCount++}`;
            params.push(start_date);
        }
        if (end_date) {
            sql += ` AND DATE(tc.clock_in) <= $${paramCount++}`;
            params.push(end_date);
        }

        sql += ' WHERE u.id = $1 GROUP BY u.id, u.name';

        const result = await query(sql, params);

        if (result.rows.length === 0) {
            throw new ApiError('Staff not found', 404);
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ============ SHIFT SWAP REQUESTS ============

// GET /api/scheduling/swap-requests - Get swap requests
router.get('/swap-requests', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, user_id } = req.query;

        let sql = `
            SELECT 
                sr.*,
                req.name as requester_name,
                tgt.name as target_name,
                rs.work_date as requester_date,
                ts.work_date as target_date,
                rst.name as requester_shift_name,
                tst.name as target_shift_name
            FROM shift_swap_requests sr
            JOIN users req ON sr.requester_id = req.id
            JOIN users tgt ON sr.target_id = tgt.id
            JOIN schedules rs ON sr.requester_schedule_id = rs.id
            JOIN schedules ts ON sr.target_schedule_id = ts.id
            JOIN shift_types rst ON rs.shift_type_id = rst.id
            JOIN shift_types tst ON ts.shift_type_id = tst.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramCount = 1;

        if (status) {
            sql += ` AND sr.status = $${paramCount++}`;
            params.push(status);
        }
        if (user_id) {
            sql += ` AND (sr.requester_id = $${paramCount} OR sr.target_id = $${paramCount})`;
            params.push(user_id);
            paramCount++;
        }

        sql += ' ORDER BY sr.created_at DESC';

        const result = await query(sql, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

// POST /api/scheduling/swap-requests - Create swap request
router.post('/swap-requests', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const schema = z.object({
            target_id: z.string().uuid(),
            requester_schedule_id: z.string().uuid(),
            target_schedule_id: z.string().uuid(),
            reason: z.string().optional()
        });
        const data = schema.parse(req.body);

        const result = await query(
            `INSERT INTO shift_swap_requests 
                (requester_id, target_id, requester_schedule_id, target_schedule_id, reason)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user?.id, data.target_id, data.requester_schedule_id, data.target_schedule_id, data.reason]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// PUT /api/scheduling/swap-requests/:id - Approve/reject swap request
router.put('/swap-requests/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            throw new ApiError('Invalid status', 400);
        }

        // Get swap request
        const swapResult = await query('SELECT * FROM shift_swap_requests WHERE id = $1', [id]);
        if (swapResult.rows.length === 0) {
            throw new ApiError('Swap request not found', 404);
        }

        const swap = swapResult.rows[0];

        if (status === 'approved') {
            // Swap the user_ids on the schedules
            await query(
                `UPDATE schedules SET user_id = $1, updated_at = NOW() WHERE id = $2`,
                [swap.target_id, swap.requester_schedule_id]
            );
            await query(
                `UPDATE schedules SET user_id = $1, updated_at = NOW() WHERE id = $2`,
                [swap.requester_id, swap.target_schedule_id]
            );
        }

        // Update swap request status
        const result = await query(
            `UPDATE shift_swap_requests SET
                status = $1,
                reviewed_by = $2,
                reviewed_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [status, req.user?.id, id]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

export default router;
