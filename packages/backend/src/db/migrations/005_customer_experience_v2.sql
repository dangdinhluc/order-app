-- Migration: 005_customer_experience_v2.sql
-- Customer Experience 2.0: BBQ/Sushi Style Menu

-- 1. Add badge columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_chef_choice BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;

-- 2. Create combo_items table for combo products
CREATE TABLE IF NOT EXISTS combo_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    included_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(combo_product_id, included_product_id)
);

-- 3. Update service_calls type constraint to include new types
-- First, check if the table exists and has the constraint
DO $$
BEGIN
    -- Drop old constraint if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'service_calls_type_check' 
        AND table_name = 'service_calls'
    ) THEN
        ALTER TABLE service_calls DROP CONSTRAINT service_calls_type_check;
    END IF;
    
    -- Add new constraint with extended types
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_calls') THEN
        ALTER TABLE service_calls ADD CONSTRAINT service_calls_type_check 
            CHECK (type IN ('water', 'grill_change', 'utensils', 'bill', 'service', 'other', 'call'));
    END IF;
END $$;

-- 4. Add some sample best sellers (existing products)
UPDATE products SET is_best_seller = true 
WHERE name_vi IN ('Phở bò tái', 'Bún bò Huế', 'Cơm sườn nướng');

-- 5. Add some chef's choice
UPDATE products SET is_chef_choice = true 
WHERE name_vi IN ('Chả giò', 'Bánh xèo');

COMMENT ON COLUMN products.is_best_seller IS 'Đánh dấu món bán chạy nhất';
COMMENT ON COLUMN products.is_chef_choice IS 'Đánh dấu món đề xuất của bếp trưởng';
COMMENT ON COLUMN products.is_combo IS 'Đánh dấu đây là combo/set menu';
COMMENT ON TABLE combo_items IS 'Danh sách món trong mỗi combo';
