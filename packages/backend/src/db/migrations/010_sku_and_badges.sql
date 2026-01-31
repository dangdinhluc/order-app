-- Add SKU to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Create Badges table
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_vi VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    color VARCHAR(20) DEFAULT 'red', -- red, blue, green, yellow, purple, gray
    icon VARCHAR(50), -- lucide icon name
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Product Badges relation
CREATE TABLE IF NOT EXISTS product_badges (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, badge_id)
);

-- Seed initial badges
INSERT INTO badges (name_vi, color, icon, sort_order)
VALUES 
    ('Best Seller', 'red', 'flame', 1),
    ('Chef Choice', 'yellow', 'crown', 2),
    ('Mới', 'green', 'sparkles', 3),
    ('Cay', 'orange', 'flame', 4)
ON CONFLICT DO NOTHING;

-- Migrate existing flags to badges
DO $$
DECLARE
    bs_id UUID;
    cc_id UUID;
BEGIN
    SELECT id INTO bs_id FROM badges WHERE name_vi = 'Best Seller' LIMIT 1;
    SELECT id INTO cc_id FROM badges WHERE name_vi = 'Chef Choice' LIMIT 1;

    -- Migrate Best Sellers
    IF bs_id IS NOT NULL THEN
        INSERT INTO product_badges (product_id, badge_id)
        SELECT id, bs_id FROM products WHERE is_best_seller = true
        ON CONFLICT DO NOTHING;
    END IF;

    -- Migrate Chef Choice
    IF cc_id IS NOT NULL THEN
        INSERT INTO product_badges (product_id, badge_id)
        SELECT id, cc_id FROM products WHERE is_chef_choice = true
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
