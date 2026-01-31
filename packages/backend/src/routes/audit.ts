import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// Log an audit event
export async function logAudit(params: {
    userId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    oldValue?: object;
    newValue?: object;
    reason?: string;
    ipAddress?: string;
}) {
    try {
        await query(
            `INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value, reason, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                params.userId || null,
                params.action,
                params.targetType || null,
                params.targetId || null,
                params.oldValue ? JSON.stringify(params.oldValue) : null,
                params.newValue ? JSON.stringify(params.newValue) : null,
                params.reason || null,
                params.ipAddress || null,
            ]
        );
    } catch (error) {
        console.error('Failed to log audit:', error);
        // Don't throw - audit logging should not break main flow
    }
}

// GET /api/audit - List audit logs (owner only)
router.get('/', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            action,
            target_type,
            user_id,
            from_date,
            to_date,
            limit = 100
        } = req.query;

        let sql = `
            SELECT 
                al.*,
                u.name as user_name,
                u.role as user_role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params: (string | number)[] = [];
        let paramIndex = 1;

        if (action) {
            sql += ` AND al.action = $${paramIndex++}`;
            params.push(action as string);
        }

        if (target_type) {
            sql += ` AND al.target_type = $${paramIndex++}`;
            params.push(target_type as string);
        }

        if (user_id) {
            sql += ` AND al.user_id = $${paramIndex++}`;
            params.push(user_id as string);
        }

        if (from_date) {
            sql += ` AND al.created_at >= $${paramIndex++}`;
            params.push(from_date as string);
        }

        if (to_date) {
            sql += ` AND al.created_at <= $${paramIndex++}`;
            params.push(to_date as string);
        }

        sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex}`;
        params.push(Number(limit));

        const result = await query(sql, params);

        res.json({
            success: true,
            data: { logs: result.rows, total: result.rows.length },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/audit/actions - List available action types
router.get('/actions', requireRole('owner'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await query(
            `SELECT DISTINCT action FROM audit_logs ORDER BY action`
        );

        res.json({
            success: true,
            data: { actions: result.rows.map(r => r.action) },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/audit/summary - Get audit summary stats
router.get('/summary', requireRole('owner'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
        // Count by action type (last 24h)
        const actionCounts = await query(`
            SELECT action, COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY action
            ORDER BY count DESC
        `);

        // Count by user (last 24h)
        const userCounts = await query(`
            SELECT u.name as user_name, COUNT(*) as count
            FROM audit_logs al
            JOIN users u ON al.user_id = u.id
            WHERE al.created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY u.name
            ORDER BY count DESC
            LIMIT 10
        `);

        // Critical actions
        const criticalActions = await query(`
            SELECT * FROM audit_logs
            WHERE action IN ('discount_applied', 'order_cancelled', 'order_void', 'price_override', 'user_login_failed')
            AND created_at >= NOW() - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            data: {
                action_counts: actionCounts.rows,
                user_counts: userCounts.rows,
                critical_actions: criticalActions.rows,
            },
        });
    } catch (error) {
        next(error);
    }
});

export { router as auditRouter };
