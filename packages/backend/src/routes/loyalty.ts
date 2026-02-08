import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';

const router: Router = Router();

// ============================================================
// CUSTOMER SEARCH (for POS integration)
// ============================================================

// GET /api/loyalty/customers - Search customers
router.get('/customers', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const search = (req.query.q as string) || '';
        const limit = parseInt(req.query.limit as string) || 20;

        let result;
        if (search) {
            result = await query(`
                SELECT c.id, c.name, c.phone, c.email, c.loyalty_points, 
                       t.name as tier_name, t.icon as tier_icon, t.color as tier_color
                FROM customers c
                LEFT JOIN loyalty_tiers t ON c.tier_id = t.id
                WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1
                ORDER BY c.name
                LIMIT $2
            `, [`%${search}%`, limit]);
        } else {
            // Return recent customers with loyalty activity
            result = await query(`
                SELECT c.id, c.name, c.phone, c.email, c.loyalty_points, 
                       t.name as tier_name, t.icon as tier_icon, t.color as tier_color
                FROM customers c
                LEFT JOIN loyalty_tiers t ON c.tier_id = t.id
                WHERE c.loyalty_points > 0
                ORDER BY c.loyalty_points DESC
                LIMIT $1
            `, [limit]);
        }

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/loyalty/customers - Create new customer
router.post('/customers', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, phone, email, birthday } = req.body;

        if (!name) {
            throw new ApiError('Name is required', 400, 'NAME_REQUIRED');
        }

        // Get base tier
        const tierResult = await query(`
            SELECT id FROM loyalty_tiers WHERE min_points = 0 AND is_active = true ORDER BY sort_order LIMIT 1
        `);
        const tierId = tierResult.rows[0]?.id || null;

        // Generate referral code
        const referralCode = `REF${Date.now().toString(36).toUpperCase()}`;

        const result = await query(`
            INSERT INTO customers (name, phone, email, birthday, tier_id, referral_code, loyalty_points, lifetime_points)
            VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
            RETURNING *
        `, [name, phone || null, email || null, birthday || null, tierId, referralCode]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            next(new ApiError('Customer with this phone/email already exists', 400, 'DUPLICATE_CUSTOMER'));
            return;
        }
        next(error);
    }
});

// ============================================================
// LOYALTY TIERS
// ============================================================

// GET /api/loyalty/tiers - Get all tiers
router.get('/tiers', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT * FROM loyalty_tiers 
            WHERE is_active = true 
            ORDER BY sort_order ASC
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/loyalty/tiers - Create tier
router.post('/tiers', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, name_ja, min_points, discount_percent, point_multiplier, color, icon, benefits } = req.body;

        const result = await query(`
            INSERT INTO loyalty_tiers (name, name_ja, min_points, discount_percent, point_multiplier, color, icon, benefits)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [name, name_ja, min_points || 0, discount_percent || 0, point_multiplier || 1.0, color || '#94a3b8', icon || '⭐', benefits]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/loyalty/tiers/:id - Update tier
router.put('/tiers/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, name_ja, min_points, discount_percent, point_multiplier, color, icon, benefits, is_active } = req.body;

        const result = await query(`
            UPDATE loyalty_tiers 
            SET name = COALESCE($2, name),
                name_ja = COALESCE($3, name_ja),
                min_points = COALESCE($4, min_points),
                discount_percent = COALESCE($5, discount_percent),
                point_multiplier = COALESCE($6, point_multiplier),
                color = COALESCE($7, color),
                icon = COALESCE($8, icon),
                benefits = COALESCE($9, benefits),
                is_active = COALESCE($10, is_active)
            WHERE id = $1
            RETURNING *
        `, [id, name, name_ja, min_points, discount_percent, point_multiplier, color, icon, benefits, is_active]);

        if (result.rows.length === 0) {
            throw new ApiError('Tier not found', 404, 'TIER_NOT_FOUND');
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================
// LOYALTY REWARDS
// ============================================================

// GET /api/loyalty/rewards - Get all rewards
router.get('/rewards', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(`
            SELECT r.*, p.name_vi as product_name_vi, p.name_ja as product_name_ja
            FROM loyalty_rewards r
            LEFT JOIN products p ON r.product_id = p.id
            WHERE r.is_active = true
            ORDER BY r.points_required ASC
        `);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/loyalty/rewards - Create reward
router.post('/rewards', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name_vi, name_ja, description_vi, description_ja, points_required, reward_type, reward_value, product_id, max_redemptions, valid_days } = req.body;

        const result = await query(`
            INSERT INTO loyalty_rewards (name_vi, name_ja, description_vi, description_ja, points_required, reward_type, reward_value, product_id, max_redemptions, valid_days)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [name_vi, name_ja, description_vi, description_ja, points_required, reward_type, reward_value, product_id, max_redemptions, valid_days || 30]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/loyalty/rewards/:id - Update reward
router.put('/rewards/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name_vi, name_ja, description_vi, description_ja, points_required, reward_type, reward_value, product_id, max_redemptions, valid_days, is_active } = req.body;

        const result = await query(`
            UPDATE loyalty_rewards 
            SET name_vi = COALESCE($2, name_vi),
                name_ja = COALESCE($3, name_ja),
                description_vi = COALESCE($4, description_vi),
                description_ja = COALESCE($5, description_ja),
                points_required = COALESCE($6, points_required),
                reward_type = COALESCE($7, reward_type),
                reward_value = COALESCE($8, reward_value),
                product_id = $9,
                max_redemptions = $10,
                valid_days = COALESCE($11, valid_days),
                is_active = COALESCE($12, is_active)
            WHERE id = $1
            RETURNING *
        `, [id, name_vi, name_ja, description_vi, description_ja, points_required, reward_type, reward_value, product_id, max_redemptions, valid_days, is_active]);

        if (result.rows.length === 0) {
            throw new ApiError('Reward not found', 404, 'REWARD_NOT_FOUND');
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/loyalty/rewards/:id - Deactivate reward
router.delete('/rewards/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        await query(`UPDATE loyalty_rewards SET is_active = false WHERE id = $1`, [id]);

        res.json({
            success: true,
            message: 'Reward deactivated'
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================
// CUSTOMER LOYALTY
// ============================================================

// GET /api/loyalty/customers/:id - Get customer loyalty info
router.get('/customers/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Get customer with tier info
        const customerResult = await query(`
            SELECT c.*, 
                   t.name as tier_name, t.name_ja as tier_name_ja, 
                   t.color as tier_color, t.icon as tier_icon,
                   t.discount_percent as tier_discount,
                   t.point_multiplier as tier_multiplier,
                   (SELECT min_points FROM loyalty_tiers WHERE min_points > COALESCE(c.lifetime_points, 0) AND is_active = true ORDER BY min_points ASC LIMIT 1) as next_tier_points
            FROM customers c
            LEFT JOIN loyalty_tiers t ON c.tier_id = t.id
            WHERE c.id = $1
        `, [id]);

        if (customerResult.rows.length === 0) {
            throw new ApiError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        }

        // Get recent history
        const historyResult = await query(`
            SELECT lh.*, o.order_number
            FROM loyalty_history lh
            LEFT JOIN orders o ON lh.order_id = o.id
            WHERE lh.customer_id = $1
            ORDER BY lh.created_at DESC
            LIMIT 10
        `, [id]);

        // Get active redemptions
        const redemptionsResult = await query(`
            SELECT cr.*, lr.name_vi as reward_name, lr.reward_type, lr.reward_value
            FROM customer_redemptions cr
            JOIN loyalty_rewards lr ON cr.reward_id = lr.id
            WHERE cr.customer_id = $1 AND cr.status = 'active'
            ORDER BY cr.expires_at ASC
        `, [id]);

        const customer = customerResult.rows[0];
        const pointsToNextTier = customer.next_tier_points
            ? customer.next_tier_points - (customer.lifetime_points || 0)
            : null;

        res.json({
            success: true,
            data: {
                customer: {
                    ...customer,
                    points_to_next_tier: pointsToNextTier
                },
                history: historyResult.rows,
                active_rewards: redemptionsResult.rows
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/loyalty/customers/:id/earn - Earn points from order
router.post('/customers/:id/earn', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { order_id, amount } = req.body;

        // Get loyalty settings
        const settingsResult = await query(`
            SELECT key, value FROM settings WHERE key LIKE 'loyalty_%'
        `);
        const settings: Record<string, string> = {};
        settingsResult.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        if (settings.loyalty_enabled !== 'true') {
            throw new ApiError('Loyalty program is disabled', 400, 'LOYALTY_DISABLED');
        }

        const minOrder = parseInt(settings.loyalty_min_order_for_points || '0');
        if (amount < minOrder) {
            throw new ApiError(`Minimum order ${minOrder} required for points`, 400, 'ORDER_TOO_SMALL');
        }

        // Get customer's tier multiplier
        const customerResult = await query(`
            SELECT c.loyalty_points, c.lifetime_points, t.point_multiplier
            FROM customers c
            LEFT JOIN loyalty_tiers t ON c.tier_id = t.id
            WHERE c.id = $1
        `, [id]);

        if (customerResult.rows.length === 0) {
            throw new ApiError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        }

        const customer = customerResult.rows[0];
        const multiplier = customer.point_multiplier || 1.0;
        const pointsPerYen = parseInt(settings.loyalty_points_per_yen || '1');

        // Calculate points: (amount / 100) * pointsPerYen * multiplier
        const basePoints = Math.floor(amount / 100) * pointsPerYen;
        const earnedPoints = Math.floor(basePoints * multiplier);

        if (earnedPoints <= 0) {
            return res.json({
                success: true,
                data: { points_earned: 0, new_balance: customer.loyalty_points }
            });
        }

        // Update customer points
        const updateResult = await query(`
            UPDATE customers 
            SET loyalty_points = loyalty_points + $2,
                lifetime_points = lifetime_points + $2
            WHERE id = $1
            RETURNING loyalty_points, lifetime_points, tier_id
        `, [id, earnedPoints]);

        // Record history
        await query(`
            INSERT INTO loyalty_history (customer_id, order_id, points, balance_after, type, description)
            VALUES ($1, $2, $3, $4, 'earn', $5)
        `, [id, order_id, earnedPoints, updateResult.rows[0].loyalty_points, `Earned from order (${multiplier}x)`]);

        res.json({
            success: true,
            data: {
                points_earned: earnedPoints,
                multiplier: multiplier,
                new_balance: updateResult.rows[0].loyalty_points,
                lifetime_points: updateResult.rows[0].lifetime_points
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/loyalty/customers/:id/redeem - Redeem reward
router.post('/customers/:id/redeem', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { reward_id } = req.body;

        // Get reward
        const rewardResult = await query(`
            SELECT * FROM loyalty_rewards WHERE id = $1 AND is_active = true
        `, [reward_id]);

        if (rewardResult.rows.length === 0) {
            throw new ApiError('Reward not found or inactive', 404, 'REWARD_NOT_FOUND');
        }

        const reward = rewardResult.rows[0];

        // Check max redemptions
        if (reward.max_redemptions && reward.current_redemptions >= reward.max_redemptions) {
            throw new ApiError('Reward is sold out', 400, 'REWARD_SOLD_OUT');
        }

        // Get customer
        const customerResult = await query(`
            SELECT loyalty_points FROM customers WHERE id = $1
        `, [id]);

        if (customerResult.rows.length === 0) {
            throw new ApiError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        }

        const customer = customerResult.rows[0];

        // Check enough points
        if (customer.loyalty_points < reward.points_required) {
            throw new ApiError(`Not enough points. Need ${reward.points_required}, have ${customer.loyalty_points}`, 400, 'INSUFFICIENT_POINTS');
        }

        // Generate voucher code
        const voucherCode = `LR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (reward.valid_days || 30));

        // Deduct points
        const updateResult = await query(`
            UPDATE customers 
            SET loyalty_points = loyalty_points - $2
            WHERE id = $1
            RETURNING loyalty_points
        `, [id, reward.points_required]);

        // Create redemption
        const redemptionResult = await query(`
            INSERT INTO customer_redemptions (customer_id, reward_id, points_used, voucher_code, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [id, reward_id, reward.points_required, voucherCode, expiresAt]);

        // Update reward redemptions count
        await query(`
            UPDATE loyalty_rewards SET current_redemptions = current_redemptions + 1 WHERE id = $1
        `, [reward_id]);

        // Record history
        await query(`
            INSERT INTO loyalty_history (customer_id, points, balance_after, type, description)
            VALUES ($1, $2, $3, 'redeem', $4)
        `, [id, -reward.points_required, updateResult.rows[0].loyalty_points, `Redeemed: ${reward.name_vi}`]);

        res.status(201).json({
            success: true,
            data: {
                redemption: redemptionResult.rows[0],
                voucher_code: voucherCode,
                expires_at: expiresAt,
                new_balance: updateResult.rows[0].loyalty_points
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/loyalty/customers/:id/adjust - Manually adjust points
router.post('/customers/:id/adjust', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { points, reason } = req.body;
        const userId = (req as any).user?.id;

        if (!points || points === 0) {
            throw new ApiError('Points adjustment required', 400, 'INVALID_POINTS');
        }

        // Update customer
        const updateResult = await query(`
            UPDATE customers 
            SET loyalty_points = GREATEST(0, loyalty_points + $2),
                lifetime_points = CASE WHEN $2 > 0 THEN lifetime_points + $2 ELSE lifetime_points END
            WHERE id = $1
            RETURNING loyalty_points, lifetime_points
        `, [id, points]);

        if (updateResult.rows.length === 0) {
            throw new ApiError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
        }

        // Record history
        await query(`
            INSERT INTO loyalty_history (customer_id, points, balance_after, type, description, created_by)
            VALUES ($1, $2, $3, 'adjust', $4, $5)
        `, [id, points, updateResult.rows[0].loyalty_points, reason || 'Manual adjustment', userId]);

        res.json({
            success: true,
            data: {
                adjustment: points,
                new_balance: updateResult.rows[0].loyalty_points,
                lifetime_points: updateResult.rows[0].lifetime_points
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/loyalty/customers/:id/history - Get full history
router.get('/customers/:id/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await query(`
            SELECT lh.*, o.order_number, u.name as created_by_name
            FROM loyalty_history lh
            LEFT JOIN orders o ON lh.order_id = o.id
            LEFT JOIN users u ON lh.created_by = u.id
            WHERE lh.customer_id = $1
            ORDER BY lh.created_at DESC
            LIMIT $2 OFFSET $3
        `, [id, limit, offset]);

        const countResult = await query(`
            SELECT COUNT(*) FROM loyalty_history WHERE customer_id = $1
        `, [id]);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit,
                offset
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/loyalty/stats - Dashboard stats
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const statsResult = await query(`
            SELECT 
                (SELECT COUNT(*) FROM customers WHERE loyalty_points > 0) as active_members,
                (SELECT SUM(loyalty_points) FROM customers) as total_points_outstanding,
                (SELECT COUNT(*) FROM customer_redemptions WHERE status = 'active') as active_rewards,
                (SELECT COUNT(*) FROM loyalty_history WHERE type = 'earn' AND created_at > NOW() - INTERVAL '30 days') as transactions_30d
        `);

        const tierBreakdown = await query(`
            SELECT t.name, t.color, t.icon, COUNT(c.id) as count
            FROM loyalty_tiers t
            LEFT JOIN customers c ON c.tier_id = t.id
            WHERE t.is_active = true
            GROUP BY t.id, t.name, t.color, t.icon, t.sort_order
            ORDER BY t.sort_order
        `);

        res.json({
            success: true,
            data: {
                ...statsResult.rows[0],
                tier_breakdown: tierBreakdown.rows
            }
        });
    } catch (error) {
        next(error);
    }
});

export { router as loyaltyRouter };
