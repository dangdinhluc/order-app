import 'dotenv/config';
import pool from './pool.js';

async function debugKitchenIssue() {
    const client = await pool.connect();
    try {
        console.log('=== DEBUGGING KITCHEN ISSUE ===\n');

        // 1. Check products
        const products = await client.query(`
            SELECT id, name_vi, display_in_kitchen 
            FROM products 
            ORDER BY name_vi 
            LIMIT 10
        `);
        console.log('📦 PRODUCTS (first 10):');
        products.rows.forEach(p => {
            console.log(`  - ${p.name_vi}: display_in_kitchen = ${p.display_in_kitchen}`);
        });

        // 2. Count products by display_in_kitchen
        const prodCount = await client.query(`
            SELECT display_in_kitchen, COUNT(*) as count 
            FROM products 
            GROUP BY display_in_kitchen
        `);
        console.log('\n📊 PRODUCTS BY DISPLAY_IN_KITCHEN:');
        prodCount.rows.forEach(r => {
            console.log(`  - display_in_kitchen = ${r.display_in_kitchen}: ${r.count} products`);
        });

        // 3. Check recent order_items
        const recentItems = await client.query(`
            SELECT oi.id, oi.product_id, p.name_vi, oi.display_in_kitchen, oi.kitchen_status, o.status as order_status
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN orders o ON oi.order_id = o.id
            ORDER BY oi.created_at DESC
            LIMIT 10
        `);
        console.log('\n🍽️ RECENT ORDER ITEMS (last 10):');
        recentItems.rows.forEach(i => {
            console.log(`  - ${i.name_vi || 'Open Item'}: display_in_kitchen = ${i.display_in_kitchen}, kitchen_status = ${i.kitchen_status}, order = ${i.order_status}`);
        });

        // 4. Count order_items by display_in_kitchen
        const itemCount = await client.query(`
            SELECT display_in_kitchen, COUNT(*) as count 
            FROM order_items 
            GROUP BY display_in_kitchen
        `);
        console.log('\n📊 ORDER_ITEMS BY DISPLAY_IN_KITCHEN:');
        itemCount.rows.forEach(r => {
            console.log(`  - display_in_kitchen = ${r.display_in_kitchen}: ${r.count} items`);
        });

        // 5. Check open orders with items
        const openOrders = await client.query(`
            SELECT o.id, o.order_number, t.name as table_name, 
                   COUNT(oi.id) as item_count,
                   SUM(CASE WHEN oi.display_in_kitchen = true THEN 1 ELSE 0 END) as kitchen_items,
                   SUM(CASE WHEN oi.display_in_kitchen = false THEN 1 ELSE 0 END) as non_kitchen_items
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'open'
            GROUP BY o.id, o.order_number, t.name
            ORDER BY o.created_at DESC
            LIMIT 5
        `);
        console.log('\n📋 OPEN ORDERS:');
        openOrders.rows.forEach(o => {
            console.log(`  - Order #${o.order_number} (${o.table_name}): ${o.item_count} items total, ${o.kitchen_items} kitchen, ${o.non_kitchen_items} non-kitchen`);
        });

        // 6. Check tables status
        const tables = await client.query(`
            SELECT id, name, status 
            FROM tables 
            ORDER BY sort_order
        `);
        console.log('\n🪑 TABLES STATUS:');
        tables.rows.forEach(t => {
            console.log(`  - ${t.name}: ${t.status}`);
        });

    } finally {
        client.release();
        await pool.end();
    }
}

debugKitchenIssue();
