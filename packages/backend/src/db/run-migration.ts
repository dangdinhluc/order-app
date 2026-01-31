// Run migration script
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hybrid_pos',
});

async function runMigration() {
    const migrationFile = process.argv[2] || '006_payment_methods.sql';
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);

    console.log('Running migration:', migrationPath);

    try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await pool.query(sql);
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
