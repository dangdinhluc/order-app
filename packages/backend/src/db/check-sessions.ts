import 'dotenv/config';
import pool from './pool.js';

async function checkSessions() {
    const client = await pool.connect();
    try {
        // Check active sessions
        const sessions = await client.query(`
            SELECT 
                ts.id, 
                ts.table_id,
                t.number as table_number,
                ts.started_at,
                ts.ended_at,
                ts.status,
                AGE(NOW(), ts.started_at) as duration
            FROM table_sessions ts
            JOIN tables t ON t.id = ts.table_id
            WHERE ts.ended_at IS NULL
            ORDER BY ts.started_at ASC
        `);

        console.log('📊 ACTIVE SESSIONS (không có ended_at):');
        console.log('=====================================');

        if (sessions.rows.length === 0) {
            console.log('Không có session active');
        } else {
            sessions.rows.forEach((s, i) => {
                console.log(`${i + 1}. Bàn ${s.table_number}:`);
                console.log(`   Started: ${s.started_at}`);
                console.log(`   Duration: ${s.duration}`);
                console.log(`   Status: ${s.status || 'N/A'}`);
                console.log('');
            });
        }

        // Check if old sessions need to be closed
        const oldSessions = await client.query(`
            SELECT COUNT(*) as count
            FROM table_sessions
            WHERE ended_at IS NULL 
            AND started_at < NOW() - INTERVAL '6 hours'
        `);

        console.log(`\n⚠️ Sessions cũ hơn 6 tiếng: ${oldSessions.rows[0].count}`);

    } finally {
        client.release();
        await pool.end();
    }
}

checkSessions();
