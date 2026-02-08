import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

const router: Router = Router();

// Validation schemas
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const verifyPinSchema = z.object({
    pin: z.string().length(6),
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const result = await query(
            'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        const user = result.rows[0];

        if (!user.is_active) {
            throw new ApiError('Account is disabled', 401, 'ACCOUNT_DISABLED');
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            throw new ApiError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/auth/me
router.get('/me', async (req: AuthRequest, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'fallback-secret'
        ) as AuthRequest['user'];

        res.json({
            success: true,
            data: { user: decoded },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/verify-pin
router.post('/verify-pin', async (req, res, next) => {
    try {
        const { pin } = verifyPinSchema.parse(req.body);

        const result = await query(
            "SELECT id, name, role FROM users WHERE pin_code = $1 AND role = 'owner'",
            [pin]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Invalid PIN', 401, 'INVALID_PIN');
        }

        res.json({
            success: true,
            data: {
                verified: true,
                user: result.rows[0],
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/set-pin - Set or update owner PIN
router.post('/set-pin', async (req: AuthRequest, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'fallback-secret'
        ) as AuthRequest['user'];

        if (decoded?.role !== 'owner') {
            throw new ApiError('Only owner can set PIN', 403, 'FORBIDDEN');
        }

        const { new_pin, current_password } = req.body;

        if (!new_pin || new_pin.length !== 6 || !/^\d{6}$/.test(new_pin)) {
            throw new ApiError('PIN must be 6 digits', 400, 'INVALID_PIN');
        }

        // Verify current password
        const userResult = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [decoded.id]
        );

        if (userResult.rows.length === 0) {
            throw new ApiError('User not found', 404, 'NOT_FOUND');
        }

        const isValidPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            throw new ApiError('Invalid password', 401, 'INVALID_PASSWORD');
        }

        // Update PIN
        await query(
            'UPDATE users SET pin_code = $1 WHERE id = $2',
            [new_pin, decoded.id]
        );

        res.json({
            success: true,
            message: 'PIN updated successfully',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/validate-pin - Validate PIN for specific action (returns action token)
router.post('/validate-pin', async (req, res, next) => {
    try {
        const { pin, action } = req.body;

        if (!pin || pin.length !== 6) {
            throw new ApiError('Invalid PIN format', 400, 'INVALID_PIN');
        }

        const result = await query(
            "SELECT id, name, role FROM users WHERE pin_code = $1 AND role = 'owner'",
            [pin]
        );

        if (result.rows.length === 0) {
            throw new ApiError('Invalid PIN', 401, 'INVALID_PIN');
        }

        // Generate short-lived token for this action
        const actionToken = jwt.sign(
            {
                user_id: result.rows[0].id,
                action: action,
                expires_at: Date.now() + 5 * 60 * 1000, // 5 minutes
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '5m' }
        );

        res.json({
            success: true,
            data: {
                verified: true,
                action_token: actionToken,
                user: result.rows[0],
            },
        });
    } catch (error) {
        next(error);
    }
});

export { router as authRouter };
