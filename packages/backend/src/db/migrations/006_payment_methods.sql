-- Migration: Add payment_methods table for admin-configurable payment methods
-- This replaces the hardcoded payment methods in the frontend

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,          -- Display name (e.g., "Tiền mặt", "カード")
    code VARCHAR(50) NOT NULL UNIQUE,    -- Internal code (e.g., "cash", "card")
    icon VARCHAR(50),                     -- Icon name for frontend (e.g., "banknote", "credit-card")
    color VARCHAR(20),                    -- Color for UI (e.g., "#10B981", "#6366F1")
    is_active BOOLEAN DEFAULT true,       -- Whether this method is available
    sort_order INTEGER DEFAULT 0,         -- Display order
    requires_change BOOLEAN DEFAULT false, -- Whether to show change calculation (cash)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default payment methods
INSERT INTO payment_methods (name, code, icon, color, is_active, sort_order, requires_change) VALUES
('Tiền mặt', 'cash', 'banknote', '#10B981', true, 1, true),
('Thẻ', 'card', 'credit-card', '#6366F1', true, 2, false),
('PayPay', 'paypay', 'smartphone', '#FF0033', true, 3, false),
('LINE Pay', 'linepay', 'smartphone', '#00C300', true, 4, false)
ON CONFLICT (code) DO NOTHING;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_payment_methods_sort ON payment_methods(is_active, sort_order);
