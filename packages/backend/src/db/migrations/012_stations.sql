-- Migration: 012_stations
-- Description: Multi-Kitchen/Bar system - Create stations and product-station assignments

-- =====================================================
-- 1. STATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'chef-hat',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active stations
CREATE INDEX IF NOT EXISTS idx_stations_active ON stations(is_active);
CREATE INDEX IF NOT EXISTS idx_stations_sort ON stations(sort_order);

-- =====================================================
-- 2. PRODUCT-STATIONS JUNCTION TABLE (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_stations (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, station_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_stations_product ON product_stations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stations_station ON product_stations(station_id);

-- =====================================================
-- 3. ADD STATION TRACKING TO ORDER_ITEMS
-- =====================================================
-- station_statuses tracks per-station status for items that go to multiple stations
-- Format: {"station_uuid_1": "pending", "station_uuid_2": "ready"}
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS station_statuses JSONB DEFAULT '{}';

-- Index for querying by station status
CREATE INDEX IF NOT EXISTS idx_order_items_station_statuses ON order_items USING gin(station_statuses);

-- =====================================================
-- 4. SEED DEFAULT STATION
-- =====================================================
-- Create a default "Main Kitchen" station for existing products
INSERT INTO stations (id, name, code, color, icon, sort_order)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Bếp Chính',
    'main_kitchen',
    '#EF4444',
    'chef-hat',
    1
) ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 5. MIGRATE EXISTING PRODUCTS
-- =====================================================
-- Assign all existing products with display_in_kitchen=true to the default station
INSERT INTO product_stations (product_id, station_id)
SELECT p.id, 'a0000000-0000-0000-0000-000000000001'::UUID
FROM products p
WHERE p.display_in_kitchen = true
ON CONFLICT DO NOTHING;
