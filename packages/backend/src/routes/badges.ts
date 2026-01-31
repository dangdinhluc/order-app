import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createBadgeSchema = z.object({
    name_vi: z.string().min(1).max(100),
    name_en: z.string().max(100).optional(),
    color: z.string().default('red'),
    icon: z.string().optional(),
    sort_order: z.number().int().default(0),
});

const updateBadgeSchema = createBadgeSchema.partial();

// GET /api/badges - List all badges
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(
            `SELECT * FROM badges WHERE is_active = true ORDER BY sort_order ASC, name_vi ASC`
        );

        res.json({
            success: true,
            data: { badges: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/badges - Create badge (owner only)
router.post(
    '/',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = createBadgeSchema.parse(req.body);

            const result = await query(
                `INSERT INTO badges (name_vi, name_en, color, icon, sort_order)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [data.name_vi, data.name_en || null, data.color, data.icon || null, data.sort_order]
            );

            res.status(201).json({
                success: true,
                data: { badge: result.rows[0] },
            });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/badges/:id - Update badge (owner only)
router.put(
    '/:id',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const data = updateBadgeSchema.parse(req.body);

            // Build dynamic update query
            const fields: string[] = [];
            const values: unknown[] = [];
            let paramCount = 1;

            if (data.name_vi !== undefined) {
                fields.push(`name_vi = $${paramCount++}`);
                values.push(data.name_vi);
            }
            if (data.name_en !== undefined) {
                fields.push(`name_en = $${paramCount++}`);
                values.push(data.name_en);
            }
            if (data.color !== undefined) {
                fields.push(`color = $${paramCount++}`);
                values.push(data.color);
            }
            if (data.icon !== undefined) {
                fields.push(`icon = $${paramCount++}`);
                values.push(data.icon);
            }
            if (data.sort_order !== undefined) {
                fields.push(`sort_order = $${paramCount++}`);
                values.push(data.sort_order);
            }

            if (fields.length === 0) {
                throw new ApiError('No fields to update', 400, 'INVALID_REQUEST');
            }

            values.push(id);

            const result = await query(
                `UPDATE badges SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                values
            );

            if (result.rows.length === 0) {
                throw new ApiError('Badge not found', 404, 'NOT_FOUND');
            }

            res.json({
                success: true,
                data: { badge: result.rows[0] },
            });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/badges/:id - Soft delete badge (owner only)
router.delete(
    '/:id',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const result = await query(
                `UPDATE badges SET is_active = false WHERE id = $1 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                throw new ApiError('Badge not found', 404, 'NOT_FOUND');
            }

            res.json({
                success: true,
                message: 'Badge deleted',
            });
        } catch (error) {
            next(error);
        }
    }
);

export { router as badgesRouter };
