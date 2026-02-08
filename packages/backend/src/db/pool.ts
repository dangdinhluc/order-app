import { Pool, types } from 'pg';

// Fix timezone issue: pg driver converts timestamps to JS Date using local timezone
// Override to return timestamps as ISO strings with UTC indicator
// Type 1114 = TIMESTAMP (without TZ) - treat as UTC, append Z
// Type 1184 = TIMESTAMPTZ - already has timezone info
types.setTypeParser(1114, (val) => val ? val.replace(' ', 'T') + 'Z' : null);
types.setTypeParser(1184, (val) => val);

// Optimized pool configuration for Neon serverless
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                        // Max connections in pool
    idleTimeoutMillis: 30000,       // Close idle connections after 30s
    connectionTimeoutMillis: 5000,  // Fail fast if can't connect in 5s
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Log pool stats periodically in development
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
        console.log(`[Pool Stats] total: ${pool.totalCount}, idle: ${pool.idleCount}, waiting: ${pool.waitingCount}`);
    }, 60000); // Every minute
}

export const query = async (text: string, params?: unknown[]) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Only log slow queries in production
    if (duration > 100 || process.env.NODE_ENV !== 'production') {
        console.log('Executed query', {
            text: text.substring(0, 80),
            duration: `${duration}ms`,
            rows: res.rowCount,
            slow: duration > 100 ? '⚠️ SLOW' : ''
        });
    }
    return res;
};

export const getClient = () => pool.connect();

export default pool;
