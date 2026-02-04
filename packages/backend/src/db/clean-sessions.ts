import 'dotenv/config';
import pool from './pool.js';

async function cleanOldSessions() {
    const client = await pool.connect();
    try {
        console.log('🧹 Cleaning old sessions...\n');

        // 1. Đóng tất cả sessions không có order active
        const closeResult = await client.query(`
            UPDATE table_sessions ts
            SET ended_at = NOW(), status = 'completed'
            WHERE ts.ended_at IS NULL
            AND NOT EXISTS (
                SELECT 1 FROM orders o 
                WHERE o.table_session_id = ts.id 
                AND o.status IN ('open', 'pending_payment')
            )
            RETURNING ts.id, ts.table_id
        `);
        console.log(`✅ Đã đóng ${closeResult.rowCount} sessions không có order active`);

        // 2. Reset tables về available nếu session đã đóng
        const resetResult = await client.query(`
            UPDATE tables t
            SET status = 'available', current_order_id = NULL
            WHERE t.status = 'occupied'
            AND NOT EXISTS (
                SELECT 1 FROM table_sessions ts 
                WHERE ts.table_id = t.id 
                AND ts.ended_at IS NULL
            )
            RETURNING t.id, t.number
        `);
        console.log(`✅ Đã reset ${resetResult.rowCount} bàn về available`);

        if (resetResult.rows.length > 0) {
            console.log('   Các bàn đã reset:', resetResult.rows.map(r => `Bàn ${r.number}`).join(', '));
        }

        console.log('\n🎉 Done!');

    } finally {
        client.release();
        await pool.end();
    }
}

cleanOldSessions();
