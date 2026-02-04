import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { query } from '../db/pool.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer with Cloudinary (for banners, logos, etc.)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'order-app/settings',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    } as any,
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/settings/upload - Upload settings image (banner, logo)
router.post(
    '/upload',
    requireRole('owner'),
    upload.single('image'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// Settings stored as JSON in a settings table
// GET /api/settings - Get all settings
router.get('/', requireRole('owner'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT key, value FROM settings
        `);

        const settings: Record<string, unknown> = {};
        for (const row of result.rows) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }

        res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        next(error);
    }
});

// MOVED TO END: Generic key getters/setters (to avoid route conflict)

// PUT /api/settings - Update multiple settings at once
router.put('/', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const settings = req.body;
        const userId = req.user?.id;

        for (const [key, value] of Object.entries(settings)) {
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

            await query(`
                INSERT INTO settings (key, value, updated_by, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()
            `, [key, valueStr, userId]);

            // Special handling: When store_settings is saved, also save brand_ keys separately
            // so the Customer Menu API can find them easily
            if (key === 'store_settings' && typeof value === 'object' && value !== null) {
                const storeSettings = value as Record<string, unknown>;
                for (const [subKey, subValue] of Object.entries(storeSettings)) {
                    if (subKey.startsWith('brand_')) {
                        const subValueStr = typeof subValue === 'string' ? subValue : JSON.stringify(subValue);
                        await query(`
                            INSERT INTO settings (key, value, updated_by, updated_at)
                            VALUES ($1, $2, $3, NOW())
                            ON CONFLICT (key) DO UPDATE SET
                                value = EXCLUDED.value,
                                updated_by = EXCLUDED.updated_by,
                                updated_at = NOW()
                        `, [subKey, subValueStr, userId]);
                    }
                }
            }
        }

        res.json({
            success: true,
            message: 'Settings updated',
        });
    } catch (error) {
        next(error);
    }
});

// =====================================
// PAYMENT METHODS
// =====================================

// GET /api/settings/payment-methods - Get all payment methods (public for POS)
router.get('/payment-methods', async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT * FROM payment_methods
            WHERE is_active = true
            ORDER BY sort_order
        `);

        res.json({
            success: true,
            data: { payment_methods: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/settings/payment-methods/all - Get all payment methods including inactive (admin)
router.get('/payment-methods/all', requireRole('owner'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT * FROM payment_methods
            ORDER BY sort_order
        `);

        res.json({
            success: true,
            data: { payment_methods: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/settings/payment-methods - Create payment method
router.post('/payment-methods', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, code, icon, color, is_active = true, sort_order = 0, requires_change = false } = req.body;

        if (!name || !code) {
            throw new ApiError('Name and code are required', 400, 'VALIDATION_ERROR');
        }

        const result = await query(`
            INSERT INTO payment_methods (name, code, icon, color, is_active, sort_order, requires_change)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [name, code, icon, color, is_active, sort_order, requires_change]);

        res.status(201).json({
            success: true,
            data: { payment_method: result.rows[0] },
        });
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            next(new ApiError('Payment method code already exists', 400, 'DUPLICATE_CODE'));
            return;
        }
        next(error);
    }
});

// PUT /api/settings/payment-methods/:id - Update payment method
router.put('/payment-methods/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, code, icon, color, is_active, sort_order, requires_change } = req.body;

        const result = await query(`
            UPDATE payment_methods
            SET name = COALESCE($1, name),
                code = COALESCE($2, code),
                icon = COALESCE($3, icon),
                color = COALESCE($4, color),
                is_active = COALESCE($5, is_active),
                sort_order = COALESCE($6, sort_order),
                requires_change = COALESCE($7, requires_change),
                updated_at = NOW()
            WHERE id = $8
            RETURNING *
        `, [name, code, icon, color, is_active, sort_order, requires_change, id]);

        if (result.rows.length === 0) {
            throw new ApiError('Payment method not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            data: { payment_method: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/settings/payment-methods/:id - Delete payment method
router.delete('/payment-methods/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const result = await query(`
            DELETE FROM payment_methods WHERE id = $1 RETURNING id
        `, [id]);

        if (result.rows.length === 0) {
            throw new ApiError('Payment method not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            message: 'Payment method deleted',
        });
    } catch (error) {
        next(error);
    }
});

// =====================================
// ADMIN V3 - SLIDESHOW IMAGES
// =====================================

// GET /api/admin/slideshow - Get all slideshow images
router.get('/slideshow', requireRole('owner'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT id, image_url, title_vi as title, sort_order
            FROM customer_slideshow_images
            WHERE is_active = true
            ORDER BY sort_order
        `);

        res.json({
            success: true,
            data: { images: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/slideshow - Add slideshow image
router.post('/slideshow', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { image_url, title = '', sort_order = 0 } = req.body;

        const result = await query(`
            INSERT INTO customer_slideshow_images (image_url, title_vi, sort_order, is_active)
            VALUES ($1, $2, $3, true)
            RETURNING *
        `, [image_url, title, sort_order]);

        res.status(201).json({
            success: true,
            image: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/admin/slideshow/:id - Delete slideshow image
router.delete('/slideshow/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        await query(`DELETE FROM customer_slideshow_images WHERE id = $1`, [id]);

        res.json({
            success: true,
            message: 'Slideshow image deleted',
        });
    } catch (error) {
        next(error);
    }
});

// =====================================
// ADMIN V3 - FEATURED PRODUCTS
// =====================================

// GET /api/admin/products-featured - Get all products with featured status
router.get('/products-featured', requireRole('owner'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        console.log('[products-featured] Executing query...');
        const result = await query(`
            SELECT p.id, p.name_vi as name, p.price, p.image_url, 
                   p.is_featured, p.featured_badge, p.featured_order,
                   c.name_vi as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_available = true
            ORDER BY p.is_featured DESC, p.featured_order, p.name_vi
        `);

        console.log('[products-featured] Query result rows:', result.rows.length);

        res.json({
            success: true,
            data: { products: result.rows },
        });
    } catch (error) {
        console.error('[products-featured] Error:', error);
        next(error);
    }
});

// PATCH /api/admin/products/:id/featured - Toggle featured status
router.patch('/products/:id/featured', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { is_featured } = req.body;

        await query(`
            UPDATE products SET is_featured = $1, updated_at = NOW()
            WHERE id = $2
        `, [is_featured, id]);

        res.json({
            success: true,
            message: 'Featured status updated',
        });
    } catch (error) {
        next(error);
    }
});

// PATCH /api/admin/products/:id/badge - Set featured badge
router.patch('/products/:id/badge', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { featured_badge } = req.body;

        await query(`
            UPDATE products SET featured_badge = $1, updated_at = NOW()
            WHERE id = $2
        `, [featured_badge, id]);

        res.json({
            success: true,
            message: 'Badge updated',
        });
    } catch (error) {
        next(error);
    }
});

// =====================================
// ADMIN V3 - QUICK NOTES
// =====================================

// GET /api/admin/quick-notes/:productId - Get quick notes for a product
router.get('/quick-notes/:productId', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { productId } = req.params;

        const result = await query(`
            SELECT id, product_id, label_vi as label, price_modifier, sort_order
            FROM product_quick_notes
            WHERE product_id = $1
            ORDER BY sort_order
        `, [productId]);

        res.json({
            success: true,
            data: { notes: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/quick-notes - Add quick note
router.post('/quick-notes', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { product_id, label, price_modifier = 0, sort_order = 0 } = req.body;

        const result = await query(`
            INSERT INTO product_quick_notes (product_id, label_vi, price_modifier, sort_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [product_id, label, price_modifier, sort_order]);

        res.status(201).json({
            success: true,
            note: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
});

// =====================================
// ADMIN V3 - TABLET MENU VISIBILITY
// =====================================

// GET /api/settings/tablet-menu - Get all items with visibility status
router.get('/tablet-menu', requireRole('owner'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT 
                c.id, c.name_vi as name, c.is_tablet_visible,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', p.id,
                            'name', p.name_vi,
                            'image_url', p.image_url,
                            'is_tablet_visible', COALESCE(p.is_tablet_visible, true)
                        ) ORDER BY p.sort_order, p.name_vi
                    ) FILTER (WHERE p.id IS NOT NULL AND p.is_available = true),
                    '[]'
                ) as products
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_available = true
            WHERE c.is_active = true
            GROUP BY c.id
            ORDER BY c.sort_order
        `);

        res.json({
            success: true,
            data: { categories: result.rows }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/settings/tablet-menu/toggle - Toggle visibility
router.post('/tablet-menu/toggle', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { type, id, is_visible } = req.body;

        if (!['category', 'product'].includes(type)) {
            throw new ApiError('Invalid type', 400, 'INVALID_TYPE');
        }

        const table = type === 'category' ? 'categories' : 'products';

        await query(`
            UPDATE ${table} SET is_tablet_visible = $1 WHERE id = $2
        `, [is_visible, id]);

        res.json({
            success: true,
            message: 'Visibility updated'
        });
    } catch (error) {
        next(error);
    }
});


// DELETE /api/admin/quick-notes/:id - Delete quick note
router.delete('/quick-notes/:id', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        await query(`DELETE FROM product_quick_notes WHERE id = $1`, [id]);

        res.json({
            success: true,
            message: 'Quick note deleted',
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/settings/:key - Get specific setting
router.get('/:key', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { key } = req.params;
        const result = await query(`
            SELECT value FROM settings WHERE key = $1
        `, [key]);

        if (result.rows.length === 0) {
            res.json({
                success: true,
                data: null,
            });
            return;
        }

        let value;
        try {
            value = JSON.parse(result.rows[0].value);
        } catch {
            value = result.rows[0].value;
        }

        res.json({
            success: true,
            data: value,
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/settings/:key - Update specific setting
router.put('/:key', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const userId = req.user?.id;

        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

        await query(`
            INSERT INTO settings (key, value, updated_by, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_by = EXCLUDED.updated_by,
                updated_at = NOW()
        `, [key, valueStr, userId]);

        res.json({
            success: true,
            message: 'Setting updated',
        });
    } catch (error) {
        next(error);
    }
});

export { router as settingsRouter };

