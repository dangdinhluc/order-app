import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';

const router: Router = Router();

// Validation schemas
const createCategorySchema = z.object({
    name_vi: z.string().min(1).max(100),
    name_ja: z.string().max(100).optional(),
    name_en: z.string().max(100).optional(),
    sort_order: z.number().int().optional(),
    name_translations: z.record(z.string()).optional(),
});

const updateCategorySchema = createCategorySchema.partial();

// GET /api/categories - List all categories
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(
            `SELECT * FROM categories WHERE is_active = true ORDER BY sort_order ASC, name_vi ASC`
        );

        res.json({
            success: true,
            data: { categories: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/categories/:id - Get single category
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT * FROM categories WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Category not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            data: { category: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/categories - Create category (owner only)
router.post(
    '/',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = createCategorySchema.parse(req.body);

            const result = await query(
                'INSERT INTO categories (name_vi, name_ja, name_en, sort_order, name_translations) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [
                    data.name_vi,
                    data.name_ja || null,
                    data.name_en || null,
                    data.sort_order || 0,
                    data.name_translations || {},
                ]
            ); res.status(201).json({
                success: true,
                data: { category: result.rows[0] },
            });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/categories/:id - Update category (owner only)
router.put(
    '/:id',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const data = updateCategorySchema.parse(req.body);

            const fields: string[] = [];
            const values: unknown[] = [];
            let paramCount = 1;

            if (data.name_vi !== undefined) {
                fields.push(`name_vi = $${paramCount++}`);
                values.push(data.name_vi);
            }
            if (data.name_ja !== undefined) {
                fields.push(`name_ja = $${paramCount++}`);
                values.push(data.name_ja);
            }
            if (data.name_en !== undefined) {
                fields.push(`name_en = $${paramCount++}`);
                values.push(data.name_en);
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
                `UPDATE categories SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                values
            );

            if (result.rows.length === 0) {
                throw new ApiError('Category not found', 404, 'NOT_FOUND');
            }

            res.json({
                success: true,
                data: { category: result.rows[0] },
            });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/categories/:id - Soft delete category (owner only)
router.delete(
    '/:id',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const result = await query(
                `UPDATE categories SET is_active = false WHERE id = $1 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                throw new ApiError('Category not found', 404, 'NOT_FOUND');
            }

            res.json({
                success: true,
                message: 'Category deleted',
            });
        } catch (error) {
            next(error);
        }
    }
);

export { router as categoriesRouter };
