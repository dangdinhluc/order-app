-- Migration 027: Add Performance Indexes
-- Purpose: Speed up frequently used queries for better performance

-- ============================================================
-- SESSION & ORDER LOOKUP INDEXES
-- ============================================================

-- Index for session token lookup (used by QR order page)
-- Partial index only for active sessions
CREATE INDEX IF NOT EXISTS idx_table_sessions_token_active 
ON table_sessions(session_token) 
WHERE ended_at IS NULL;

-- Index for order lookup by session
CREATE INDEX IF NOT EXISTS idx_orders_session_status 
ON orders(table_session_id, status);

-- Index for order lookup by table
CREATE INDEX IF NOT EXISTS idx_orders_table_status 
ON orders(table_id, status);

-- Index for order items lookup
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON order_items(order_id);

-- ============================================================
-- MENU/PRODUCT INDEXES
-- ============================================================

-- Index for available products (menu loading)
CREATE INDEX IF NOT EXISTS idx_products_available_sort 
ON products(is_available, sort_order) 
WHERE is_available = true;

-- Index for active categories (menu loading)
CREATE INDEX IF NOT EXISTS idx_categories_active_sort 
ON categories(is_active, sort_order) 
WHERE is_active = true;

-- Index for products by category
CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category_id);

-- ============================================================
-- TABLE & AREA INDEXES
-- ============================================================

-- Index for tables by area
CREATE INDEX IF NOT EXISTS idx_tables_area 
ON tables(area_id);

-- Index for tables by status
CREATE INDEX IF NOT EXISTS idx_tables_status 
ON tables(status);

-- ============================================================
-- KITCHEN INDEXES
-- ============================================================

-- Index for kitchen queue (pending items)
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_status 
ON order_items(kitchen_status) 
WHERE display_in_kitchen = true;

-- Index for kitchen tickets
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status 
ON kitchen_tickets(status);

-- ============================================================
-- SERVICE CALLS INDEXES
-- ============================================================

-- Index for pending service calls
CREATE INDEX IF NOT EXISTS idx_service_calls_status 
ON service_calls(status) 
WHERE status = 'pending';

-- ============================================================
-- ANALYTICS/REPORTING INDEXES
-- ============================================================

-- Index for orders by date (reporting)
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC);

-- Index for orders by paid date (sales reporting)
CREATE INDEX IF NOT EXISTS idx_orders_paid_at 
ON orders(paid_at DESC) 
WHERE paid_at IS NOT NULL;

-- ============================================================
-- ANALYZE TABLES (Update query planner statistics)
-- ============================================================

ANALYZE table_sessions;
ANALYZE orders;
ANALYZE order_items;
ANALYZE products;
ANALYZE categories;
ANALYZE tables;
ANALYZE kitchen_tickets;
ANALYZE service_calls;
