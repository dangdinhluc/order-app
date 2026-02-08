import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';

const router: Router = Router();

// Validation schemas
const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1).max(100),
    role: z.enum(['owner', 'cashier', 'kitchen']),
    pin_code: z.string().length(6).optional(),
});

const updateUserSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    role: z.enum(['owner', 'cashier', 'kitchen']).optional(),
    is_active: z.boolean().optional(),
    email: z.string().email().optional(),
});

const resetPinSchema = z.object({
    pin_code: z.string().length(6),
});

// GET /api/users - List all users (owner only)
router.get('/', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(
            `SELECT id, email, name, role, is_active, created_at, pin_code IS NOT NULL as has_pin 
             FROM users 
             WHERE is_active = true 
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            data: { users: result.rows },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/users - Create new user
router.post('/', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = createUserSchema.parse(req.body);

        // Check if email exists
        const existingInfo = await query('SELECT id FROM users WHERE email = $1', [data.email]);
        if (existingInfo.rows.length > 0) {
            throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        const result = await query(
            `INSERT INTO users (email, password_hash, name, role, pin_code)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, name, role, is_active`,
            [data.email, passwordHash, data.name, data.role, data.pin_code || null]
        );

        res.status(201).json({
            success: true,
            data: { user: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/users/:id - Update user info
router.put('/:id', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateUserSchema.parse(req.body);

        const fields: string[] = [];
        const values: unknown[] = [];
        let paramCount = 1;

        if (data.name) {
            fields.push(`name = $${paramCount++}`);
            values.push(data.name);
        }
        if (data.role) {
            fields.push(`role = $${paramCount++}`);
            values.push(data.role);
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${paramCount++}`);
            values.push(data.is_active);
        }
        if (data.email) {
            // Check email uniqueness if changing
            const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [data.email, id]);
            if (existing.rows.length > 0) {
                throw new ApiError('Email already exists', 400, 'EMAIL_EXISTS');
            }
            fields.push(`email = $${paramCount++}`);
            values.push(data.email);
        }

        if (fields.length === 0) {
            throw new ApiError('No fields to update', 400, 'INVALID_REQUEST');
        }

        values.push(id);

        const result = await query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} 
             RETURNING id, email, name, role, is_active`,
            values
        );

        if (result.rows.length === 0) {
            throw new ApiError('User not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            data: { user: result.rows[0] },
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/users/:id/pin - Reset/Set PIN
router.put('/:id/pin', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { pin_code } = resetPinSchema.parse(req.body);

        const result = await query(
            `UPDATE users SET pin_code = $1 WHERE id = $2 RETURNING id`,
            [pin_code, id]
        );

        if (result.rows.length === 0) {
            throw new ApiError('User not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            message: 'PIN code updated successfully',
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/users/:id - Soft delete (Deactivate)
router.delete('/:id', requireRole('owner'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Prevent deleting self
        // Note: req.user is populated by auth middleware but typed in AuthRequest. 
        // We can cast req to AuthRequest or use standard check.
        // For standard Request, we might not have user, but requireRole ensures it.
        // Let's assume AuthRequest structure.
        const currentUser = (req as AuthRequest).user;
        if (currentUser && currentUser.id === id) {
            throw new ApiError('Cannot delete yourself', 400, 'INVALID_ACTION');
        }

        const result = await query(
            `UPDATE users SET is_active = false WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new ApiError('User not found', 404, 'NOT_FOUND');
        }

        res.json({
            success: true,
            message: 'User deactivated successfully',
        });
    } catch (error) {
        next(error);
    }
});

export { router as usersRouter };
