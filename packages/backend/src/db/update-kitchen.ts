import 'dotenv/config';
import pool from './pool.js';

async function updateAllKitchen() {
    const client = await pool.connect();
    try {
        // Update tất cả products hiển thị trong bếp
        const result = await client.query('UPDATE products SET display_in_kitchen = true');
        console.log('✅ Đã cập nhật ' + result.rowCount + ' sản phẩm hiển thị trong bếp!');

        // Kiểm tra
        const check = await client.query('SELECT COUNT(*) as total FROM products WHERE display_in_kitchen = true');
        console.log('📊 Tổng sản phẩm hiển thị trong bếp: ' + check.rows[0].total);
    } finally {
        client.release();
        await pool.end();
    }
}

updateAllKitchen();
