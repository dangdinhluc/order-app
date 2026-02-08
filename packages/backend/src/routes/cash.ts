import { Router, Response, NextFunction } from 'express';
import { query, getClient } from '../db/pool'; // Use getClient for transactions if needed, but simple queries for now
import { AuthRequest, requireRole } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { logAudit } from './audit';

const router: Router = Router();

// GET /api/cash/current - Get current shift status
router.get('/current', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await query(
            `SELECT * FROM cash_shifts WHERE status = 'open' ORDER BY started_at DESC LIMIT 1`
        );

        if (result.rows.length === 0) {
            return res.json({ success: true, data: { shift: null } });
        }

        const shift = result.rows[0];

        // Calculate current balance based on transactions
        // Formula: start_amount + sum(pay_in) - sum(pay_out) + sum(cash_payments_from_orders)
        // Note: For MVP, we might only track pay_in/out here. 
        // Real cash tracking needs to sum "cash" orders from 'orders' table.

        // 1. Get Pay In/Out
        const transResult = await query(
            `SELECT type, SUM(amount) as total FROM cash_transactions WHERE shift_id = $1 GROUP BY type`,
            [shift.id]
        );

        let payIn = 0;
        let payOut = 0;
        transResult.rows.forEach(r => {
            if (r.type === 'pay_in') payIn = Number(r.total);
            if (r.type === 'pay_out') payOut = Number(r.total);
        });

        // 2. Get Cash Sales (Orders paid by cash during this shift)
        const salesResult = await query(
            `SELECT SUM(p.amount) as total
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             WHERE p.method = 'cash' 
             AND o.created_at >= $1`,
            [shift.started_at]
        );
        const cashSales = Number(salesResult.rows[0].total) || 0;

        const currentBalance = Number(shift.start_amount) + payIn - payOut + cashSales;

        res.json({
            success: true,
            data: {
                shift,
                pay_in: payIn,
                pay_out: payOut,
                cash_sales: cashSales,
                current_balance: currentBalance
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/cash/open - Open a new shift
router.post('/open', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { start_amount, note } = req.body;
        const userId = req.user?.id;

        // Check if there is already an open shift
        const check = await query(`SELECT id FROM cash_shifts WHERE status = 'open'`);
        if (check.rows.length > 0) {
            throw new ApiError('There is already an open shift', 400, 'SHIFT_ALREADY_OPEN');
        }

        const result = await query(
            `INSERT INTO cash_shifts (user_id, start_amount, status, note)
             VALUES ($1, $2, 'open', $3)
             RETURNING id, start_amount, started_at`,
            [userId, start_amount, note]
        );

        await logAudit({
            userId,
            action: 'open_shift',
            reason: `Opened shift with ${start_amount}`,
            newValue: { start_amount }
        });

        res.json({ success: true, data: { shift: result.rows[0] } });
    } catch (error) {
        next(error);
    }
});

// POST /api/cash/close - Close the shift
router.post('/close', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { end_amount, note } = req.body;
        const userId = req.user?.id;

        // Get current open shift
        const shiftResult = await query(`SELECT * FROM cash_shifts WHERE status = 'open' LIMIT 1`);
        if (shiftResult.rows.length === 0) {
            throw new ApiError('No open shift found', 404, 'NO_OPEN_SHIFT');
        }
        const shift = shiftResult.rows[0];

        // Calculate expected amount logic (same as GET /current)
        const transResult = await query(
            `SELECT type, SUM(amount) as total FROM cash_transactions WHERE shift_id = $1 GROUP BY type`,
            [shift.id]
        );
        let payIn = 0;
        let payOut = 0;
        transResult.rows.forEach(r => {
            if (r.type === 'pay_in') payIn = Number(r.total);
            if (r.type === 'pay_out') payOut = Number(r.total);
        });

        const salesResult = await query(
            `SELECT SUM(p.amount) as total
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             WHERE p.method = 'cash' 
             AND o.created_at >= $1`,
            [shift.started_at]
        );
        const cashSales = Number(salesResult.rows[0].total) || 0;

        const expectedEndAmount = Number(shift.start_amount) + payIn - payOut + cashSales;
        const difference = Number(end_amount) - expectedEndAmount;

        // Close it
        const result = await query(
            `UPDATE cash_shifts 
             SET status = 'closed', 
                 end_amount = $1, 
                 expected_end_amount = $2, 
                 difference_amount = $3, 
                 ended_at = NOW(),
                 note = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE note END
             WHERE id = $5
             RETURNING *`,
            [end_amount, expectedEndAmount, difference, note, shift.id]
        );

        await logAudit({
            userId,
            action: 'close_shift',
            reason: `Closed shift. Expected: ${expectedEndAmount}, Actual: ${end_amount}, Diff: ${difference}`,
            oldValue: { status: 'open' },
            newValue: { status: 'closed', end_amount, difference }
        });

        res.json({ success: true, data: { shift: result.rows[0] } });
    } catch (error) {
        next(error);
    }
});

// POST /api/cash/transaction - Pay In / Pay Out
router.post('/transaction', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { type, amount, reason } = req.body; // type: 'pay_in' | 'pay_out'
        const userId = req.user?.id;

        // Get current shift
        const shiftResult = await query(`SELECT id FROM cash_shifts WHERE status = 'open' LIMIT 1`);
        if (shiftResult.rows.length === 0) {
            throw new ApiError('No open shift found. Please open a shift first.', 400, 'NO_OPEN_SHIFT');
        }
        const shiftId = shiftResult.rows[0].id;

        const result = await query(
            `INSERT INTO cash_transactions (shift_id, type, amount, reason, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [shiftId, type, amount, reason, userId]
        );

        await logAudit({
            userId,
            action: type,
            reason: `${type === 'pay_in' ? 'Deposit' : 'Withdraw'}: ${amount} - ${reason}`,
            newValue: { amount }
        });

        res.json({ success: true, data: { transaction: result.rows[0] } });
    } catch (error) {
        next(error);
    }
});

// GET /api/cash/history - List past shifts
router.get('/history', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const limit = 20;
        const result = await query(`
            SELECT cs.*, u.name as user_name 
            FROM cash_shifts cs
            LEFT JOIN users u ON cs.user_id = u.id
            ORDER BY cs.started_at DESC
            LIMIT $1
        `, [limit]);

        res.json({ success: true, data: { shifts: result.rows } });
    } catch (error) {
        next(error);
    }
});

export { router as cashRouter };
