import 'dotenv/config';
import pool from './pool.js';

async function resetDatabase() {
    const client = await pool.connect();
    try {
        console.log('🗑️  Resetting database (preserving USERS table)...');

        // 1. Get all table names
        const { rows } = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);

        // 2. Filter out tables to keep
        const keepTables = ['users', 'migrations', 'schema_migrations'];
        const tablesToTruncate = rows
            .map(r => r.table_name)
            .filter(t => !keepTables.includes(t));

        if (tablesToTruncate.length === 0) {
            console.log('No tables to truncate.');
            return;
        }

        // 3. Truncate tables with CASCADE
        console.log(`Truncating ${tablesToTruncate.length} tables:`, tablesToTruncate.join(', '));

        await client.query('BEGIN');

        // Disable triggers temporarily to avoid side effects during mass deletion
        // await client.query('SET session_replication_role = \'replica\';'); 
        // Actually, CASCADE with normal truncation is safer and cleaner than disabling triggers often

        const truncateQuery = `TRUNCATE TABLE ${tablesToTruncate.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;
        await client.query(truncateQuery);

        // Reset specific functional values if needed (e.g. sequences that didn't restart?)
        // TRUNCATE ... RESTART IDENTITY does this.

        await client.query('COMMIT');
        console.log('✅ Database reset successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Reset failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

resetDatabase();
