import 'dotenv/config';
import pool from './pool.js';

async function checkTimezone() {
    const client = await pool.connect();
    try {
        console.log('=== TIMEZONE CHECK ===\n');

        // 1. Check PostgreSQL timezone
        const tz = await client.query("SHOW timezone");
        console.log('📍 Database timezone:', tz.rows[0].TimeZone);

        // 2. Check current time in database
        const dbTime = await client.query("SELECT NOW() as db_now, NOW() AT TIME ZONE 'UTC' as utc_now");
        console.log('🕒 Database NOW():', dbTime.rows[0].db_now);
        console.log('🕒 Database NOW() UTC:', dbTime.rows[0].utc_now);

        // 3. Check recent table_sessions
        const sessions = await client.query(`
            SELECT id, table_id, started_at, 
                   started_at AT TIME ZONE 'UTC' as started_at_utc,
                   NOW() - started_at as duration
            FROM table_sessions 
            WHERE status = 'active'
            ORDER BY started_at DESC
            LIMIT 3
        `);
        console.log('\n📋 Active table sessions:');
        sessions.rows.forEach(s => {
            console.log(`  - Session ${s.id}: started_at = ${s.started_at}, UTC = ${s.started_at_utc}, duration = ${s.duration}`);
        });

        // 4. Check JavaScript Date handling
        if (sessions.rows.length > 0) {
            const testDate = sessions.rows[0].started_at;
            console.log('\n🧪 JavaScript Date test:');
            console.log('  - Raw value from DB:', testDate);
            console.log('  - typeof:', typeof testDate);
            console.log('  - JSON.stringify:', JSON.stringify(testDate));
            const jsDate = new Date(testDate);
            console.log('  - new Date().toISOString():', jsDate.toISOString());
        }

    } finally {
        client.release();
        await pool.end();
    }
}

checkTimezone();
