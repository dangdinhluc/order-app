import 'dotenv/config';
import fs, { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
    const client = await pool.connect();

    try {
        console.log('🗄️  Running database migrations...\n');

        // Create migrations table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Get executed migrations
        const { rows: executedMigrations } = await client.query('SELECT name FROM migrations');
        const executedNames = new Set(executedMigrations.map(row => row.name));

        // Smart check: If 'users' table exists but 001 not in migrations, assume it ran
        const { rows: tableCheck } = await client.query("SELECT to_regclass('public.users') as exists");
        if (tableCheck[0]?.exists && !executedNames.has('001_initial_schema.sql')) {
            console.log('ℹ️  Legacy schema detected. Marking 001 as executed.');
            await client.query("INSERT INTO migrations (name) VALUES ('001_initial_schema.sql')");
            executedNames.add('001_initial_schema.sql');
        }

        // Read migration files from directory
        const migrationsDir = join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Ensure sorted execution

        for (const file of files) {
            if (executedNames.has(file)) {
                console.log(`⏩ Skipping: ${file} (already executed)`);
                continue;
            }

            const filePath = join(migrationsDir, file);
            const sql = readFileSync(filePath, 'utf-8');

            console.log(`📄 Running: ${file}`);
            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`✅ Completed: ${file}\n`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        console.log('🎉 All migrations completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
});
