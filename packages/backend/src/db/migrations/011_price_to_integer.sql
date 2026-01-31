-- Migration: Convert price columns from DECIMAL to INTEGER
-- This removes the decimal places (.00) from prices

-- Convert products.price to INTEGER
ALTER TABLE products ALTER COLUMN price TYPE INTEGER USING ROUND(price)::INTEGER;

-- Convert order_items.unit_price to INTEGER
ALTER TABLE order_items ALTER COLUMN unit_price TYPE INTEGER USING ROUND(unit_price)::INTEGER;

-- Convert order_items.open_item_price to INTEGER (if exists)
ALTER TABLE order_items ALTER COLUMN open_item_price TYPE INTEGER USING ROUND(COALESCE(open_item_price, 0))::INTEGER;
