-- Migration: Customer Tablet V3 - Multilingual & Featured Products
-- Date: 2026-01-31

-- ============================================
-- PRODUCTS: Add multilingual columns
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_jp VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_cn VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_vi TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_jp TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_cn TEXT;

-- Featured products flags
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_badge VARCHAR(50); -- hot, new, chef, sale
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_order INTEGER DEFAULT 0;

-- ============================================
-- CATEGORIES: Add multilingual columns
-- ============================================
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_jp VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_cn VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

-- ============================================
-- PRODUCT QUICK NOTES (Admin-defined per product)
-- ============================================
CREATE TABLE IF NOT EXISTS product_quick_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    label_vi VARCHAR(100) NOT NULL,
    label_jp VARCHAR(100),
    label_cn VARCHAR(100),
    price_modifier INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_quick_notes_product_id ON product_quick_notes(product_id);

-- ============================================
-- CUSTOMER V3 SLIDESHOW IMAGES
-- ============================================
CREATE TABLE IF NOT EXISTS customer_slideshow_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url VARCHAR(500) NOT NULL,
    title_vi VARCHAR(200),
    title_jp VARCHAR(200),
    title_cn VARCHAR(200),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Insert default V3 settings if not exists
-- ============================================
INSERT INTO settings (key, value) VALUES 
    ('customer_v3_idle_timeout', '120000'),
    ('customer_v3_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Mark some existing products as featured (sample)
-- ============================================
UPDATE products SET is_featured = true, featured_badge = 'hot', featured_order = 1
WHERE id IN (SELECT id FROM products WHERE is_available = true ORDER BY RANDOM() LIMIT 3);

COMMENT ON TABLE product_quick_notes IS 'Quick notes for products (e.g., "Không hành", "Suất lớn +300¥")';
COMMENT ON TABLE customer_slideshow_images IS 'Slideshow images for customer tablet idle screen';
