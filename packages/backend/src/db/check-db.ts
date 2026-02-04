import 'dotenv/config';
import pool from './pool.js';

async function checkDatabase() {
    const client = await pool.connect();

    try {
        console.log('🔍 CHECKING DATABASE SCHEMA...\n');

        // 1. Get all tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log(`📊 DATABASE TABLES (${tables.rows.length} tables):\n`);
        tables.rows.forEach((r, i) => {
            console.log(`${(i + 1).toString().padStart(2)}. ${r.table_name}`);
        });

        // 2. Check critical columns in 'tables' table
        console.log('\n✅ Checking TABLES table columns:');
        const tableCols = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tables' 
            ORDER BY ordinal_position
        `);
        tableCols.rows.forEach(r => {
            const check = r.column_name === 'current_order_id' ? '✅' : '  ';
            console.log(`${check} ${r.column_name.padEnd(20)} (${r.data_type})`);
        });

        // 3. Check foreign keys
        console.log('\n🔗 Foreign Key Constraints:');
        const fks = await client.query(`
            SELECT 
                tc.constraint_name, 
                tc.table_name, 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'tables'
        `);

        if (fks.rows.length > 0) {
            fks.rows.forEach(r => {
                console.log(`  ${r.column_name} -> ${r.foreign_table_name}(${r.foreign_column_name})`);
            });
        } else {
            console.log('  No foreign keys found');
        }

        // 4. Check indexes
        console.log('\n📑 Indexes on TABLES:');
        const indexes = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'tables'
        `);
        indexes.rows.forEach(r => {
            const check = r.indexname.includes('current_order') ? '✅' : '  ';
            console.log(`${check} ${r.indexname}`);
        });

        console.log('\n🎉 Database check complete!');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

checkDatabase();
