
import 'dotenv/config';
import { query } from './db/pool.js';

async function main() {
    try {
        const res = await query('SELECT id, name, number FROM tables ORDER BY number ASC LIMIT 1');
        if (res.rows.length > 0) {
            console.log('VALID_TABLE_ID:', res.rows[0].id);
            console.log('TABLE_NAME:', res.rows[0].name);
        } else {
            console.log('NO_TABLES_FOUND');
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

main();
