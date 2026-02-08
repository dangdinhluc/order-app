import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';

const router: Router = Router();

const createVoucherSchema = z.object({
    code: z.string().min(3).max(20).regex(/^[A-Za-z0-9_-]+$/),
    type: z.enum(['percent', 'fixed']),
    value: z.number().positive(),
    min_order_amount: z.number().min(0).default(0),
    max_discount_amount: z.number().positive().optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    usage_limit: z.number().int().positive().optional(),
});

// GET /api/vouchers - List all vouchers (owner only)
router.get('/', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(
            `SELECT * FROM vouchers ORDER BY created_at DESC`
        );
        res.json({ success: true, data: { vouchers: result.rows } });
    } catch (error) {
        next(error);
    }
});

// POST /api/vouchers - Create voucher
router.post('/', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createVoucherSchema.parse(req.body);

        const result = await query(
            `INSERT INTO vouchers (code, type, value, min_order_amount, max_discount_amount, start_date, end_date, usage_limit)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                data.code.toUpperCase(),
                data.type,
                data.value,
                data.min_order_amount,
                data.max_discount_amount || null,
                data.start_date || null,
                data.end_date || null,
                data.usage_limit || null
            ]
        );

        res.status(201).json({ success: true, data: { voucher: result.rows[0] } });
    } catch (error) {
        next(error);
    }
});

// POST /api/vouchers/validate - Check voucher validity
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code, orderTotal } = req.body;

        const result = await query(
            `SELECT * FROM vouchers WHERE code = $1 AND is_active = true`,
            [code.toUpperCase()]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Voucher invalid', 400, 'INVALID_VOUCHER');
        }

        const voucher = result.rows[0];
        const now = new Date();

        if (voucher.start_date && new Date(voucher.start_date) > now) {
            throw new ApiError('Voucher not yet active', 400, 'VOUCHER_NOT_ACTIVE');
        }
        if (voucher.end_date && new Date(voucher.end_date) < now) {
            throw new ApiError('Voucher expired', 400, 'VOUCHER_EXPIRED');
        }
        if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) {
            throw new ApiError('Voucher usage limit reached', 400, 'VOUCHER_LIMIT_REACHED');
        }
        if (orderTotal < parseFloat(voucher.min_order_amount)) {
            throw new ApiError(`Order must be at least ${voucher.min_order_amount}`, 400, 'MIN_ORDER_AMOUNT');
        }

        // Calculate discount
        let discount = 0;
        if (voucher.type === 'percent') {
            discount = (orderTotal * parseFloat(voucher.value)) / 100;
        } else {
            discount = parseFloat(voucher.value);
        }

        if (voucher.max_discount_amount) {
            discount = Math.min(discount, parseFloat(voucher.max_discount_amount));
        }

        res.json({
            success: true,
            data: {
                valid: true,
                discount: Math.min(discount, orderTotal),
                voucher
            }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/vouchers/:id - Delete (Soft delete)
router.delete('/:id', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await query('UPDATE vouchers SET is_active = false WHERE id = $1', [id]);
        res.json({ success: true, message: 'Voucher deactivated' });
    } catch (error) {
        next(error);
    }
});

export { router as vouchersRouter };
