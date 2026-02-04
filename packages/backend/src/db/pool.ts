import { Pool, types } from 'pg';

// Fix timezone issue: pg driver converts timestamps to JS Date using local timezone
// Override to return timestamps as ISO strings with UTC indicator
// Type 1114 = TIMESTAMP (without TZ) - treat as UTC, append Z
// Type 1184 = TIMESTAMPTZ - already has timezone info
types.setTypeParser(1114, (val) => val ? val.replace(' ', 'T') + 'Z' : null); // TIMESTAMP -> ISO with Z
types.setTypeParser(1184, (val) => val); // TIMESTAMPTZ - keep as-is

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = async (text: string, params?: unknown[]) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
};

export const getClient = () => pool.connect();

export default pool;
