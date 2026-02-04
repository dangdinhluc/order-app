import 'dotenv/config';
import pool from './pool.js';

async function closeTable3() {
    const client = await pool.connect();
    try {
        console.log('🧹 Đóng session và reset bàn 3...\n');

        // 1. Cancel order #219
        const r1 = await client.query("UPDATE orders SET status = 'cancelled' WHERE order_number = 219");
        console.log(`✅ Cancel order #219 (${r1.rowCount} rows)`);

        // 2. Close session
        const r2 = await client.query(`
            UPDATE table_sessions 
            SET ended_at = NOW(), status = 'completed' 
            WHERE id = '86cc3f7c-bf79-42f8-8b90-8c299c8de661'
        `);
        console.log(`✅ Đóng session cũ (${r2.rowCount} rows)`);

        // 3. Reset table 3
        const r3 = await client.query("UPDATE tables SET status = 'available', current_order_id = NULL WHERE number = 3");
        console.log(`✅ Reset bàn 3 về trống (${r3.rowCount} rows)`);

        console.log('\n🎉 Done! Bàn 3 đã sẵn sàng!');
    } finally {
        client.release();
        await pool.end();
    }
}

closeTable3();
