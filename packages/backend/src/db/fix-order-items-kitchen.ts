import 'dotenv/config';
import pool from './pool.js';

async function fixOrderItemsKitchen() {
    const client = await pool.connect();
    try {
        // Update all order_items that have a product with display_in_kitchen = true
        // but the order_item itself has display_in_kitchen = false
        const result = await client.query(`
            UPDATE order_items oi
            SET display_in_kitchen = true
            FROM products p
            WHERE oi.product_id = p.id
              AND p.display_in_kitchen = true
              AND oi.display_in_kitchen = false
        `);
        console.log('✅ Đã cập nhật ' + result.rowCount + ' order items với display_in_kitchen = true');

        // Also update open items to display in kitchen by default
        const openItemsResult = await client.query(`
            UPDATE order_items
            SET display_in_kitchen = true
            WHERE product_id IS NULL
              AND open_item_name IS NOT NULL
              AND display_in_kitchen = false
        `);
        console.log('✅ Đã cập nhật ' + openItemsResult.rowCount + ' open items với display_in_kitchen = true');

        // Verify
        const check = await client.query(`
            SELECT COUNT(*) as total FROM order_items WHERE display_in_kitchen = true
        `);
        console.log('📊 Tổng order items hiển thị trong bếp: ' + check.rows[0].total);

        // Check open orders
        const openOrders = await client.query(`
            SELECT COUNT(*) as total FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'open' AND oi.display_in_kitchen = true
        `);
        console.log('📋 Order items đang mở có display_in_kitchen = true: ' + openOrders.rows[0].total);

    } finally {
        client.release();
        await pool.end();
    }
}

fixOrderItemsKitchen();
