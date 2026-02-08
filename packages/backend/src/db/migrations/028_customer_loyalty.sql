-- Migration 028: Customer Loyalty System
-- Purpose: Add loyalty points, tiers, rewards for customer retention

-- ============================================================
-- 1. LOYALTY TIERS (Cấp bậc thành viên)
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,              -- Silver, Gold, Platinum
    name_ja VARCHAR(50),                    -- シルバー, ゴールド, プラチナ
    min_points INTEGER NOT NULL DEFAULT 0,  -- Điểm tối thiểu để đạt tier
    discount_percent DECIMAL(5,2) DEFAULT 0, -- % giảm giá cho tier
    point_multiplier DECIMAL(3,2) DEFAULT 1.0, -- x1.5 điểm cho Gold
    color VARCHAR(20) DEFAULT '#94a3b8',    -- Màu hiển thị
    icon VARCHAR(50) DEFAULT '⭐',          -- Icon/emoji
    benefits TEXT,                          -- Mô tả quyền lợi
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO loyalty_tiers (name, name_ja, min_points, discount_percent, point_multiplier, color, icon, sort_order) VALUES
('Member', 'メンバー', 0, 0, 1.0, '#94a3b8', '👤', 0),
('Silver', 'シルバー', 500, 3, 1.2, '#9ca3af', '🥈', 1),
('Gold', 'ゴールド', 2000, 5, 1.5, '#fbbf24', '🥇', 2),
('Platinum', 'プラチナ', 5000, 10, 2.0, '#a855f7', '💎', 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. EXTEND CUSTOMERS TABLE
-- ============================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifetime_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES loyalty_tiers(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES customers(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Set default tier for existing customers
UPDATE customers SET tier_id = (
    SELECT id FROM loyalty_tiers WHERE min_points = 0 LIMIT 1
) WHERE tier_id IS NULL;

-- ============================================================
-- 3. LOYALTY HISTORY (Lịch sử điểm)
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,                -- +100 hoặc -50
    balance_after INTEGER,                  -- Số dư sau giao dịch
    type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'redeem', 'bonus', 'expire', 'adjust', 'referral')),
    description VARCHAR(255),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. LOYALTY REWARDS (Phần thưởng có thể đổi)
-- ============================================================

CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_vi VARCHAR(100) NOT NULL,
    name_ja VARCHAR(100),
    description_vi TEXT,
    description_ja TEXT,
    points_required INTEGER NOT NULL,
    reward_type VARCHAR(30) NOT NULL CHECK (reward_type IN ('discount_percent', 'discount_fixed', 'free_item', 'voucher')),
    reward_value DECIMAL(10,2),             -- % hoặc số tiền
    product_id UUID REFERENCES products(id), -- Nếu free_item
    max_redemptions INTEGER,                 -- Giới hạn số lần đổi
    current_redemptions INTEGER DEFAULT 0,
    valid_days INTEGER DEFAULT 30,           -- Số ngày hiệu lực sau khi đổi
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample rewards
INSERT INTO loyalty_rewards (name_vi, name_ja, points_required, reward_type, reward_value, sort_order) VALUES
('Giảm 5%', '5%オフ', 100, 'discount_percent', 5, 1),
('Giảm 10%', '10%オフ', 200, 'discount_percent', 10, 2),
('Giảm ¥500', '¥500オフ', 300, 'discount_fixed', 500, 3),
('Giảm ¥1000', '¥1000オフ', 500, 'discount_fixed', 1000, 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. CUSTOMER REDEMPTIONS (Lịch sử đổi thưởng)
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
    points_used INTEGER NOT NULL,
    voucher_code VARCHAR(20) UNIQUE,        -- Mã voucher tạo ra
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    used_order_id UUID REFERENCES orders(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. LOYALTY SETTINGS
-- ============================================================

-- Add loyalty settings to settings table
INSERT INTO settings (key, value) VALUES
('loyalty_enabled', 'true'),
('loyalty_points_per_yen', '1'),
('loyalty_min_order_for_points', '0'),
('loyalty_birthday_bonus', '100'),
('loyalty_referral_bonus', '50'),
('loyalty_welcome_bonus', '50')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_loyalty_history_customer ON loyalty_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_created ON loyalty_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_redemptions_customer ON customer_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_redemptions_status ON customer_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier_id);
CREATE INDEX IF NOT EXISTS idx_customers_points ON customers(loyalty_points);

-- ============================================================
-- 8. FUNCTIONS
-- ============================================================

-- Function to auto-update tier based on points
CREATE OR REPLACE FUNCTION update_customer_tier()
RETURNS TRIGGER AS $$
BEGIN
    -- Find the highest tier that customer qualifies for
    NEW.tier_id := (
        SELECT id FROM loyalty_tiers 
        WHERE min_points <= NEW.lifetime_points AND is_active = true
        ORDER BY min_points DESC 
        LIMIT 1
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update tier
DROP TRIGGER IF EXISTS trigger_update_customer_tier ON customers;
CREATE TRIGGER trigger_update_customer_tier
    BEFORE UPDATE OF lifetime_points ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_tier();

-- ============================================================
-- 9. ANALYZE
-- ============================================================

ANALYZE loyalty_tiers;
ANALYZE loyalty_history;
ANALYZE loyalty_rewards;
ANALYZE customer_redemptions;
ANALYZE customers;
