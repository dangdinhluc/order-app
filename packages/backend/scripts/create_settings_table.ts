import 'dotenv/config';
import { query } from '../src/db/pool';

async function migrate() {
    console.log('Running migration...');
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_by UUID REFERENCES users(id),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Settings table created successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
