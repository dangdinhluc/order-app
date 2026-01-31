import 'dotenv/config';
import { query } from '../src/db/pool';

async function migrate() {
    console.log('Running Audit Log migration...');
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                action VARCHAR(50) NOT NULL,
                target_type VARCHAR(50),
                target_id VARCHAR(255),
                old_value JSONB,
                new_value JSONB,
                reason TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        `);
        console.log('Audit Log table created successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
