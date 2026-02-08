-- Menu Engineering: Cost tracking and analysis
-- Thêm giá vốn vào products và tạo bảng phân tích menu

-- Add cost_price to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,0) DEFAULT 0;

-- Menu analysis history table
CREATE TABLE IF NOT EXISTS menu_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    revenue DECIMAL(12,0) DEFAULT 0,
    cost DECIMAL(12,0) DEFAULT 0,
    profit DECIMAL(12,0) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,  -- percentage
    popularity_index DECIMAL(5,2) DEFAULT 0, -- relative to average
    category VARCHAR(20) CHECK (category IN ('star', 'workhorse', 'puzzle', 'dog')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_menu_analysis_product ON menu_analysis(product_id);
CREATE INDEX IF NOT EXISTS idx_menu_analysis_period ON menu_analysis(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_menu_analysis_category ON menu_analysis(category);

-- Add comment
COMMENT ON TABLE menu_analysis IS 'BCG Matrix analysis for menu engineering';
COMMENT ON COLUMN menu_analysis.category IS 'star=high profit high sales, workhorse=low profit high sales, puzzle=high profit low sales, dog=low profit low sales';
