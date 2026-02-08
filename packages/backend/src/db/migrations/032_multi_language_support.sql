-- Migration: 032_multi_language_support
-- Description: Create languages table and add JSONB translation columns

-- 1. Create languages table
CREATE TABLE IF NOT EXISTS languages (
    code VARCHAR(10) PRIMARY KEY, -- 'vi', 'en', 'ja', 'ko', 'zh'
    name VARCHAR(50) NOT NULL,    -- 'Tiếng Việt', 'English'
    flag_icon VARCHAR(10),        -- '🇻🇳', '🇺🇸'
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert default languages
INSERT INTO languages (code, name, flag_icon, is_active, is_default) VALUES
('vi', 'Tiếng Việt', '🇻🇳', true, true),
('en', 'English', '🇺🇸', true, false),
('ja', '日本語', '🇯🇵', true, false),
('ko', '한국어', '🇰🇷', true, false),
('zh', '中文', '🇨🇳', true, false)
ON CONFLICT (code) DO NOTHING;

-- 3. Add translation columns to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name_translations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS description_translations JSONB DEFAULT '{}';

-- 4. Add translation columns to categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS name_translations JSONB DEFAULT '{}';

-- 5. Create index for faster JSONB lookups (optional but good for future)
CREATE INDEX IF NOT EXISTS idx_products_name_translations ON products USING gin (name_translations);
CREATE INDEX IF NOT EXISTS idx_categories_name_translations ON categories USING gin (name_translations);
