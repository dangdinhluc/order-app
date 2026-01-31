import 'dotenv/config';
import { query } from './db/pool';

async function markMigrated() {
    try {
        console.log('Marking 002_seed_data.sql as executed...');
        await query("INSERT INTO migrations (name) VALUES ('002_seed_data.sql') ON CONFLICT (name) DO NOTHING");
        console.log('✅ Marked successfully');
    } catch (err) {
        console.error('❌ Failed:', err);
    }
    process.exit(0);
}

markMigrated();
