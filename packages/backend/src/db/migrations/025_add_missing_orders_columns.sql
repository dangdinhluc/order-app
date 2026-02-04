-- Migration: Add missing columns to orders table
-- Created: 2026-02-02
-- Purpose: Fix schema-code alignment issues found in audit
-- Note: order_type already exists as ENUM type, skipping it

-- 1. Add cancel tracking columns (HIGH priority - needed for cancel feature)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancelled_by UUID 
REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. Add voucher tracking columns (used in payment flow)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS voucher_id UUID 
REFERENCES vouchers(id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_by ON orders(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_orders_voucher_id ON orders(voucher_id);

-- 4. Add helpful comments
COMMENT ON COLUMN orders.cancelled_at IS 'Timestamp when order was cancelled';
COMMENT ON COLUMN orders.cancelled_by IS 'User ID who cancelled this order';
COMMENT ON COLUMN orders.cancel_reason IS 'Reason provided for cancellation';
COMMENT ON COLUMN orders.voucher_id IS 'Applied voucher/discount code';
COMMENT ON COLUMN orders.voucher_code IS 'Voucher code used (for display)';
