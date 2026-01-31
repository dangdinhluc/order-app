import 'dotenv/config';
import { query } from '../src/db/pool';

async function migrate() {
    console.log('Running Cash Management migration...');
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS cash_shifts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id),
                start_amount DECIMAL(12, 2) NOT NULL,
                end_amount DECIMAL(12, 2),
                expected_end_amount DECIMAL(12, 2),
                difference_amount DECIMAL(12, 2),
                started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                ended_at TIMESTAMP WITH TIME ZONE,
                status VARCHAR(20) DEFAULT 'open', -- open, closed
                note TEXT
            );

            CREATE TABLE IF NOT EXISTS cash_transactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                shift_id UUID REFERENCES cash_shifts(id),
                type VARCHAR(20) NOT NULL, -- pay_in, pay_out
                amount DECIMAL(12, 2) NOT NULL,
                reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_by UUID REFERENCES users(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_cash_shifts_status ON cash_shifts(status);
            CREATE INDEX IF NOT EXISTS idx_cash_transactions_shift_id ON cash_transactions(shift_id);
        `);
        console.log('Cash Management tables created successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
