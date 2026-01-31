import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: 'owner' | 'cashier' | 'kitchen';
        name: string;
    };
}

export const authMiddleware = (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError('Unauthorized - No token provided', 401, 'UNAUTHORIZED');
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'fallback-secret';

        const decoded = jwt.verify(token, secret) as AuthRequest['user'];
        req.user = decoded;

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new ApiError('Unauthorized - Invalid token', 401, 'INVALID_TOKEN'));
        } else {
            next(error);
        }
    }
};

// Middleware to check if user has required role
export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError('Unauthorized', 401, 'UNAUTHORIZED'));
        }

        if (!roles.includes(req.user.role)) {
            return next(new ApiError('Forbidden - Insufficient permissions', 403, 'FORBIDDEN'));
        }

        next();
    };
};
