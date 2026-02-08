import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { Server as SocketIOServer } from 'socket.io';

const router: Router = Router();

// Configure Multer
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer with Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'order-app/products',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        // transformation: [{ width: 500, height: 500, crop: 'limit' }], // Optional
    } as any, // Cast to any to avoid type issues with params
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Validation schemas
const createProductSchema = z.object({
    category_id: z.string().uuid().optional(),
    sku: z.string().max(50).optional(),
    name_vi: z.string().min(1).max(100),
    name_ja: z.string().max(100).optional(),
    name_en: z.string().max(100).optional(),
    price: z.number().positive(),
    display_in_kitchen: z.boolean().default(false),
    is_available: z.boolean().default(true),
    sort_order: z.number().int().optional(),
    image_url: z.string().max(500).optional(),
    is_best_seller: z.boolean().default(false),
    is_chef_choice: z.boolean().default(false),
    is_combo: z.boolean().default(false),
    badge_ids: z.array(z.string().uuid()).optional(),
    station_ids: z.array(z.string().uuid()).optional(),
    name_translations: z.record(z.string()).optional(),
    description_translations: z.record(z.string()).optional(),
});

const updateProductSchema = createProductSchema.partial();

// POST /api/products/upload - Upload product image
router.post(
    '/upload',
    requireRole('owner'),
    upload.single('image'),
    (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw new ApiError('No file uploaded', 400, 'NO_FILE');
            }

            const imageUrl = req.file.path; // Cloudinary returns the URL in 'path'
            res.json({
                success: true,
                data: { imageUrl },
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/products - List all products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category_id, kitchen_only, available_only } = req.query;

        let sql = `
      SELECT p.*, 
        c.name_vi as category_name_vi, 
        c.name_ja as category_name_ja,
        COALESCE(
            json_agg(
                DISTINCT jsonb_build_object('id', b.id, 'name_vi', b.name_vi, 'color', b.color, 'icon', b.icon)
            ) FILTER (WHERE b.id IS NOT NULL),
            '[]'
        ) as badges,
        COALESCE(
            json_agg(
                DISTINCT jsonb_build_object('id', s.id, 'name', s.name, 'code', s.code, 'color', s.color)
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
        ) as stations
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_badges pb ON p.id = pb.product_id
      LEFT JOIN badges b ON pb.badge_id = b.id AND b.is_active = true
      LEFT JOIN product_stations ps ON p.id = ps.product_id
      LEFT JOIN stations s ON ps.station_id = s.id
      WHERE 1=1
    `;
        const params: unknown[] = [];
        let paramCount = 1;

        if (category_id) {
            sql += ` AND p.category_id = $${paramCount++}`;
            params.push(category_id);
        }

        if (kitchen_only === 'true') {
            sql += ` AND p.display_in_kitchen = true`;
        }

        if (available_only !== 'false') {
            sql += ` AND p.is_available = true`;
        }

        sql += ` GROUP BY p.id, c.id ORDER BY p.sort_order ASC, p.name_vi ASC`;

        const result = await query(sql, params);

        res.json({
            success: true,
            data: { products: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT p.*, 
                c.name_vi as category_name_vi,
                COALESCE(
                    json_agg(
                        json_build_object('id', b.id, 'name_vi', b.name_vi, 'color', b.color, 'icon', b.icon)
                    ) FILTER (WHERE b.id IS NOT NULL),
                    '[]'
                ) as badges
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_badges pb ON p.id = pb.product_id
            LEFT JOIN badges b ON pb.badge_id = b.id AND b.is_active = true
            WHERE p.id = $1
            GROUP BY p.id, c.id`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Product not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            data: { product: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/products - Create product (owner only)
// POST /api/products - Create product (owner only)
router.post(
    '/',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = createProductSchema.parse(req.body);

            const result = await query(
                `INSERT INTO products (category_id, sku, name_vi, name_ja, name_en, price, display_in_kitchen, is_available, sort_order, image_url, is_best_seller, is_chef_choice, is_combo, name_translations, description_translations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
                [
                    data.category_id || null,
                    data.sku || null,
                    data.name_vi,
                    data.name_ja || null,
                    data.name_en || null,
                    data.price,
                    data.display_in_kitchen,
                    data.is_available,
                    data.sort_order || 0,
                    data.image_url || null,
                    data.is_best_seller || false,
                    data.is_chef_choice || false,
                    data.is_combo || false,
                    data.name_translations || {},
                    data.description_translations || {},
                ]
            );

            const productId = result.rows[0].id;

            // Insert badges
            if (data.badge_ids && data.badge_ids.length > 0) {
                const values = data.badge_ids.map((badgeId, index) => `($1, $${index + 2})`).join(', ');
                await query(
                    `INSERT INTO product_badges (product_id, badge_id) VALUES ${values}`,
                    [productId, ...data.badge_ids]
                );
            }

            // Insert station assignments
            if (data.station_ids && data.station_ids.length > 0) {
                const stationValues = data.station_ids.map((stationId, index) => `($1, $${index + 2})`).join(', ');
                await query(
                    `INSERT INTO product_stations (product_id, station_id) VALUES ${stationValues}`,
                    [productId, ...data.station_ids]
                );
            }

            // Fetch created product with badges
            const finalResult = await query(
                `SELECT p.*, 
                    c.name_vi as category_name_vi,
                    c.name_ja as category_name_ja,
                    COALESCE(
                        json_agg(
                            json_build_object('id', b.id, 'name_vi', b.name_vi, 'color', b.color, 'icon', b.icon)
                        ) FILTER (WHERE b.id IS NOT NULL),
                        '[]'
                    ) as badges
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_badges pb ON p.id = pb.product_id
                LEFT JOIN badges b ON pb.badge_id = b.id
                WHERE p.id = $1
                GROUP BY p.id, c.id`,
                [productId]
            );

            res.status(201).json({
                success: true,
                data: { product: finalResult.rows[0] },
            });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/products/:id - Update product (owner only)
router.put(
    '/:id',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const data = updateProductSchema.parse(req.body);

            // Build dynamic update query
            const updates: string[] = [];
            const values: unknown[] = [];
            let paramCount = 1;

            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && key !== 'badge_ids' && key !== 'station_ids') {
                    updates.push(`${key} = $${paramCount++}`);
                    values.push(value);
                }
            });

            // If only badge_ids or station_ids are provided, updates might be empty.
            if (updates.length > 0) {
                values.push(id);
                const result = await query(
                    `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                    values
                );
                if (result.rows.length === 0) {
                    throw new ApiError('Product not found', 404, 'NOT_FOUND');
                }
            } else if (!data.badge_ids && !data.station_ids) {
                // No update fields (including badge_ids or station_ids)
                throw new ApiError('No fields to update', 400, 'INVALID_REQUEST');
            }

            // Update badges if provided
            if (data.badge_ids) {
                // Remove old badges
                await query('DELETE FROM product_badges WHERE product_id = $1', [id]);

                // Add new badges
                if (data.badge_ids.length > 0) {
                    const badgeValues = data.badge_ids.map((badgeId, index) => `($1, $${index + 2})`).join(', ');
                    await query(
                        `INSERT INTO product_badges (product_id, badge_id) VALUES ${badgeValues}`,
                        [id, ...data.badge_ids]
                    );
                }
            }

            // Update station assignments if provided
            if (data.station_ids) {
                // Remove old station assignments
                await query('DELETE FROM product_stations WHERE product_id = $1', [id]);

                // Add new station assignments
                if (data.station_ids.length > 0) {
                    const stationValues = data.station_ids.map((stationId, index) => `($1, $${index + 2})`).join(', ');
                    await query(
                        `INSERT INTO product_stations (product_id, station_id) VALUES ${stationValues}`,
                        [id, ...data.station_ids]
                    );
                }
            }

            // Fetch updated product with badges
            const finalResult = await query(
                `SELECT p.*, 
                    c.name_vi as category_name_vi,
                    c.name_ja as category_name_ja,
                    COALESCE(
                        json_agg(
                            json_build_object('id', b.id, 'name_vi', b.name_vi, 'color', b.color, 'icon', b.icon)
                        ) FILTER (WHERE b.id IS NOT NULL),
                        '[]'
                    ) as badges
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_badges pb ON p.id = pb.product_id
                LEFT JOIN badges b ON pb.badge_id = b.id
                WHERE p.id = $1
                GROUP BY p.id, c.id`,
                [id]
            );

            if (finalResult.rows.length === 0) {
                // Should not happen if product exists, unless deleted in between
                throw new ApiError('Product not found', 404, 'NOT_FOUND');
            }

            res.json({
                success: true,
                data: { product: finalResult.rows[0] },
            });
        } catch (error) {
            next(error);
        }
    }
);

// PATCH /api/products/:id/availability - Toggle sold out (kitchen/owner)
router.patch(
    '/:id/availability',
    requireRole('owner', 'kitchen'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { is_available } = req.body;

            const result = await query(
                `UPDATE products SET is_available = $1 WHERE id = $2 RETURNING *`,
                [is_available, id]
            );

            if (result.rows.length === 0) {
                throw new ApiError('Product not found', 404, 'NOT_FOUND');
            }

            // Emit socket event for real-time sync
            const io: SocketIOServer = req.app.get('io');
            if (io) {
                io.emit('product:availability_changed', {
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

// PATCH /api/products/:id/badges - Toggle badges (owner only)
router.patch(
    '/:id/badges',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const { is_best_seller, is_chef_choice, is_combo } = req.body;

            // Build dynamic update query
            const updates: string[] = [];
            const values: unknown[] = [];
            let paramCount = 1;

            if (is_best_seller !== undefined) {
                updates.push(`is_best_seller = $${paramCount++}`);
                values.push(is_best_seller);
            }
            if (is_chef_choice !== undefined) {
                updates.push(`is_chef_choice = $${paramCount++}`);
                values.push(is_chef_choice);
            }
            if (is_combo !== undefined) {
                updates.push(`is_combo = $${paramCount++}`);
                values.push(is_combo);
            }

            if (updates.length === 0) {
                throw new ApiError('No badges to update', 400, 'INVALID_REQUEST');
            }

            values.push(id);

            const result = await query(
                `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                values
            );

            if (result.rows.length === 0) {
                throw new ApiError('Product not found', 404, 'NOT_FOUND');
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

// DELETE /api/products/:id - Delete product (owner only)
router.delete(
    '/:id',
    requireRole('owner'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const result = await query(
                `DELETE FROM products WHERE id = $1 RETURNING id`,
                [id]
            );

            if (result.rows.length === 0) {
                throw new ApiError('Product not found', 404, 'NOT_FOUND');
            }

            res.json({
                success: true,
                message: 'Product deleted',
            });
        } catch (error) {
            next(error);
        }
    }
);

export { router as productsRouter };
