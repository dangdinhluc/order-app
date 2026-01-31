// Quick script to fix UTF-8 encoding for user names
import { query } from './db';

async function fixEncoding() {
    try {
        console.log('Fixing UTF-8 encoding for user names...');

        await query(`UPDATE users SET name = 'Chủ quán' WHERE role = 'owner'`);
        await query(`UPDATE users SET name = 'Thu ngân' WHERE role = 'cashier'`);
        await query(`UPDATE users SET name = 'Bếp trưởng' WHERE role = 'kitchen'`);

        const result = await query(`SELECT id, name, email, role FROM users`);
        console.log('Updated users:', result.rows);

        console.log('✅ UTF-8 encoding fixed successfully!');
    } catch (error) {
        console.error('❌ Failed to fix encoding:', error);
    }
    process.exit(0);
}

fixEncoding();
