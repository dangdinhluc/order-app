-- Migration: 001_initial_schema
-- Description: Create all core tables for Hybrid POS System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users (Nhân viên + Chủ quán)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'cashier', 'kitchen')),
    pin_code VARCHAR(6),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories (Danh mục sản phẩm)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_vi VARCHAR(100) NOT NULL,
    name_ja VARCHAR(100),
    name_en VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products (Sản phẩm: Food + Grocery)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku VARCHAR(50) UNIQUE,
    name_vi VARCHAR(100) NOT NULL,
    name_ja VARCHAR(100),
    name_en VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    display_in_kitchen BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    image_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tables (Bàn)
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number INTEGER UNIQUE NOT NULL,
    name VARCHAR(50),
    capacity INTEGER DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available' 
        CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Customers (Khách quen)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(100),
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table Sessions (Phiên làm việc của bàn - cho QR Security)
CREATE TABLE table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE NOT NULL,
    session_token VARCHAR(64) UNIQUE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    customer_count INTEGER DEFAULT 1
);

-- 7. Orders (Đơn hàng)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL,
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    table_session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'open' 
        CHECK (status IN ('open', 'pending_payment', 'paid', 'cancelled')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_reason VARCHAR(255),
    surcharge_amount DECIMAL(10,2) DEFAULT 0,
    surcharge_reason VARCHAR(255),
    total DECIMAL(10,2) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 8. Order Items (Chi tiết đơn hàng)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    open_item_name VARCHAR(100),
    open_item_price DECIMAL(10,2),
    display_in_kitchen BOOLEAN DEFAULT false,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    note VARCHAR(255),
    kitchen_status VARCHAR(20) DEFAULT 'pending'
        CHECK (kitchen_status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
    kitchen_started_at TIMESTAMPTZ,
    kitchen_ready_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Payments (Thanh toán)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    method VARCHAR(30) NOT NULL 
        CHECK (method IN ('cash', 'card', 'paypay', 'linepay', 'other')),
    amount DECIMAL(10,2) NOT NULL,
    received_amount DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    reference VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Promotions (Khuyến mãi)
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('percent', 'fixed', 'buy_x_get_y')),
    value DECIMAL(10,2),
    buy_quantity INTEGER,
    get_quantity INTEGER,
    applicable_products UUID[],
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Cash Drawer Logs (Lịch sử két tiền)
CREATE TABLE cash_drawer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(20) CHECK (action IN ('open_shift', 'close_shift', 'deposit', 'withdraw', 'count')),
    amount DECIMAL(10,2),
    expected_amount DECIMAL(10,2),
    actual_amount DECIMAL(10,2),
    difference DECIMAL(10,2),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Audit Logs (Ghi lại hành động quan trọng)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Service Calls (Gọi nhân viên)
CREATE TABLE service_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    type VARCHAR(30) CHECK (type IN ('water', 'bill', 'service', 'other')),
    message VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 14. Bill Templates (Thiết kế hóa đơn)
CREATE TABLE bill_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) DEFAULT 'Default',
    logo_url VARCHAR(500),
    header_text TEXT,
    footer_text TEXT,
    show_logo BOOLEAN DEFAULT true,
    font_size VARCHAR(10) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INDEXES =====

CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_kitchen_status ON order_items(kitchen_status);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_display_in_kitchen ON products(display_in_kitchen);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_table_sessions_token ON table_sessions(session_token);
CREATE INDEX idx_table_sessions_table_id ON table_sessions(table_id);

-- ===== TRIGGERS =====

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
