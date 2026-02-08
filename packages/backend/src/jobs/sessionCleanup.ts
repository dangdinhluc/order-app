/**
 * Session Cleanup Job
 * 
 * Chạy định kỳ để dọn dẹp sessions cũ/zombie
 * - Mỗi 30 phút kiểm tra 1 lần
 * - Đóng sessions > 12 tiếng không có activity
 * - Log lại để audit
 */

import pool from '../db/pool.js';

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 phút
const MAX_SESSION_HOURS = 12; // Sessions > 12 tiếng sẽ bị đóng

export async function cleanupStaleSessions(): Promise<{ closed: number; cancelled: number }> {
    const client = await pool.connect();
    try {
        console.log('🧹 [Session Cleanup] Starting cleanup job...');

        // 1. Tìm sessions cũ hơn MAX_SESSION_HOURS giờ
        const staleSessionsResult = await client.query(`
            SELECT 
                ts.id as session_id,
                ts.table_id,
                t.number as table_number,
                ts.started_at,
                AGE(NOW(), ts.started_at) as duration
            FROM table_sessions ts
            JOIN tables t ON t.id = ts.table_id
            WHERE ts.ended_at IS NULL
            AND ts.started_at < NOW() - INTERVAL '${MAX_SESSION_HOURS} hours'
        `);

        if (staleSessionsResult.rows.length === 0) {
            console.log('✅ [Session Cleanup] No stale sessions found');
            return { closed: 0, cancelled: 0 };
        }

        console.log(`⚠️  [Session Cleanup] Found ${staleSessionsResult.rows.length} stale sessions`);

        let closedCount = 0;
        let cancelledCount = 0;

        for (const session of staleSessionsResult.rows) {
            // 2. Cancel any open orders in this session (EXCLUDE debt orders!)
            const cancelResult = await client.query(`
                UPDATE orders 
                SET status = 'cancelled', 
                    cancel_reason = 'Auto-cancelled: session timeout after ${MAX_SESSION_HOURS} hours'
                WHERE table_session_id = $1 
                AND status IN ('open', 'pending_payment')
            `, [session.session_id]);

            cancelledCount += cancelResult.rowCount || 0;

            // 3. Close the session - use 'completed' to match DB check constraint
            await client.query(`
                UPDATE table_sessions 
                SET ended_at = NOW(), 
                    status = 'completed'
                WHERE id = $1
            `, [session.session_id]);

            // 4. Reset the table
            await client.query(`
                UPDATE tables 
                SET status = 'available', 
                    current_order_id = NULL
                WHERE id = $1
            `, [session.table_id]);

            closedCount++;

            console.log(`   📋 Closed: Table ${session.table_number} (session started ${session.duration} ago)`);
        }

        console.log(`✅ [Session Cleanup] Completed: ${closedCount} sessions closed, ${cancelledCount} orders cancelled`);

        return { closed: closedCount, cancelled: cancelledCount };

    } catch (error) {
        console.error('❌ [Session Cleanup] Error:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Biến để track interval
let cleanupInterval: NodeJS.Timeout | null = null;

export function startSessionCleanupJob(): void {
    // Chạy ngay khi start
    cleanupStaleSessions().catch(err => {
        console.error('❌ [Session Cleanup] Initial cleanup failed:', err);
    });

    // Sau đó chạy định kỳ
    cleanupInterval = setInterval(() => {
        cleanupStaleSessions().catch(err => {
            console.error('❌ [Session Cleanup] Scheduled cleanup failed:', err);
        });
    }, CLEANUP_INTERVAL_MS);

    console.log(`🕐 [Session Cleanup] Job scheduled every ${CLEANUP_INTERVAL_MS / 60000} minutes`);
}

export function stopSessionCleanupJob(): void {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log('🛑 [Session Cleanup] Job stopped');
    }
}
