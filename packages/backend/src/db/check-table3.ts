import 'dotenv/config';
import pool from './pool.js';

async function checkTable3() {
    const client = await pool.connect();
    try {
        console.log('🔍 Kiểm tra Bàn 3...\n');

        // Check session
        const session = await client.query(`
            SELECT ts.*, t.number as table_number
            FROM table_sessions ts
            JOIN tables t ON t.id = ts.table_id
            WHERE t.number = 3 AND ts.ended_at IS NULL
        `);

        if (session.rows.length > 0) {
            const s = session.rows[0];
            console.log('📋 Session:');
            console.log(`   ID: ${s.id}`);
            console.log(`   Started: ${s.started_at}`);
            console.log(`   Status: ${s.status}`);
        }

        // Check orders
        const orders = await client.query(`
            SELECT o.id, o.order_number, o.status, o.total, o.created_at
            FROM orders o
            JOIN table_sessions ts ON o.table_session_id = ts.id
            JOIN tables t ON t.id = ts.table_id
            WHERE t.number = 3 AND ts.ended_at IS NULL
            ORDER BY o.created_at DESC
        `);

        console.log('\n📦 Orders:');
        if (orders.rows.length === 0) {
            console.log('   Không có order');
        } else {
            orders.rows.forEach((o, i) => {
                console.log(`   ${i + 1}. #${o.order_number} - Status: ${o.status} - ¥${o.total}`);
            });
        }

        console.log('\n💡 Để đóng session này, chạy clean với force option');

    } finally {
        client.release();
        await pool.end();
    }
}

checkTable3();
