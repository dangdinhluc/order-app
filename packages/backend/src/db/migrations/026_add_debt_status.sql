-- Migration: Add 'debt' status for orders (Khách nợ)
-- Created: 2026-02-02
-- Purpose: Allow marking orders as debt to prevent auto-cancellation

-- 1. Update status check constraint to include 'debt'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('open', 'pending_payment', 'paid', 'cancelled', 'debt'));

-- 2. Add debt tracking columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS debt_marked_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS debt_marked_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS debt_note TEXT;

-- 3. Add index for faster debt queries
CREATE INDEX IF NOT EXISTS idx_orders_debt ON orders(status) WHERE status = 'debt';

-- 4. Add comments
COMMENT ON COLUMN orders.debt_marked_at IS 'When the order was marked as debt';
COMMENT ON COLUMN orders.debt_marked_by IS 'User who marked this order as debt';
COMMENT ON COLUMN orders.debt_note IS 'Note about the debt (customer name, phone, etc)';
