import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';

const router: Router = Router();

// Validation schemas
const createStationSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(50),
    color: z.string().max(20).default('#3B82F6'),
    icon: z.string().max(50).default('chef-hat'),
    is_active: z.boolean().default(true),
    sort_order: z.number().int().default(0),
});

const updateStationSchema = createStationSchema.partial();

// GET /api/stations - List all stations
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT * FROM stations 
            ORDER BY sort_order ASC, name ASC
        `);

        res.json({
            success: true,
            data: { stations: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/stations/active - List only active stations
router.get('/active', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT * FROM stations 
            WHERE is_active = true
            ORDER BY sort_order ASC, name ASC
        `);

        res.json({
            success: true,
            data: { stations: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/stations/:id - Get single station
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT * FROM stations WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Station not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            data: { station: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/stations - Create station (owner only)
router.post(
    '/',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = createStationSchema.parse(req.body);

            const result = await query(
                `INSERT INTO stations (name, code, color, icon, is_active, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [data.name, data.code, data.color, data.icon, data.is_active, data.sort_order]
            );

            res.status(201).json({
                success: true,
                data: { station: result.rows[0] },
            });
        } catch (error: any) {
            // Handle unique constraint violation for code
            if (error.code === '23505' && error.constraint?.includes('code')) {
                next(new ApiError('Mã station đã tồn tại', 400, 'DUPLICATE_CODE'));
            } else {
                next(error);
            }
        }
    }
);

// PUT /api/stations/:id - Update station (owner only)
router.put(
    '/:id',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const data = updateStationSchema.parse(req.body);

            // Build dynamic update query
            const updates: string[] = [];
            const values: unknown[] = [];
            let paramCount = 1;

            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    updates.push(`${key} = $${paramCount++}`);
                    values.push(value);
                }
            });

            if (updates.length === 0) {
                throw new ApiError('No fields to update', 400, 'INVALID_REQUEST');
            }

            values.push(id);
            const result = await query(
                `UPDATE stations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                values
            );

            if (result.rows.length === 0) {
                throw new ApiError('Station not found', 404, 'NOT_FOUND');
            }

            res.json({
                success: true,
                data: { station: result.rows[0] },
            });
        } catch (error: any) {
            if (error.code === '23505' && error.constraint?.includes('code')) {
                next(new ApiError('Mã station đã tồn tại', 400, 'DUPLICATE_CODE'));
            } else {
                next(error);
            }
        }
    }
);

// DELETE /api/stations/:id - Delete station (owner only)
router.delete(
    '/:id',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            // Check if station has products assigned
            const productCheck = await query(
                `SELECT COUNT(*) FROM product_stations WHERE station_id = $1`,
                [id]
            );

            if (parseInt(productCheck.rows[0].count) > 0) {
                throw new ApiError(
                    'Không thể xóa station đang có sản phẩm. Hãy gỡ sản phẩm trước.',
                    400,
                    'HAS_PRODUCTS'
                );
            }

            const result = await query(
                `DELETE FROM stations WHERE id = $1 RETURNING id`,
                [id]
            );

            if (result.rows.length === 0) {
                throw new ApiError('Station not found', 404, 'NOT_FOUND');
            }

            res.json({
                success: true,
                message: 'Station deleted',
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/stations/:id/products - Get products assigned to a station
router.get('/:id/products', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT p.*, c.name_vi as category_name_vi
            FROM products p
            JOIN product_stations ps ON p.id = ps.product_id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ps.station_id = $1
            ORDER BY p.name_vi ASC
        `, [id]);

        res.json({
            success: true,
            data: { products: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

export { router as stationsRouter };
