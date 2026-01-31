-- Seed Data for Hybrid POS System
-- Description: Sample data for development and testing

-- ===== USERS =====
-- Password: "password123" (bcrypt hash)
INSERT INTO users (email, password_hash, name, role, pin_code, is_active) VALUES
('owner@hybrid-pos.local', '$2a$10$SmM6/Iy9dd24JaEJONvgxePPDqbolI9tDBfWX42F6uTw6ybVe0Z5e', 'Chủ quán', 'owner', '123456', true),
('cashier@hybrid-pos.local', '$2a$10$SmM6/Iy9dd24JaEJONvgxePPDqbolI9tDBfWX42F6uTw6ybVe0Z5e', 'Thu ngân', 'cashier', NULL, true),
('kitchen@hybrid-pos.local', '$2a$10$SmM6/Iy9dd24JaEJONvgxePPDqbolI9tDBfWX42F6uTw6ybVe0Z5e', 'Bếp trưởng', 'kitchen', NULL, true);

-- ===== CATEGORIES =====
INSERT INTO categories (name_vi, name_ja, name_en, sort_order, is_active) VALUES
('Phở & Bún', 'フォー＆ブン', 'Pho & Noodles', 1, true),
('Cơm', 'ご飯', 'Rice Dishes', 2, true),
('Món khai vị', '前菜', 'Appetizers', 3, true),
('Đồ uống', '飲み物', 'Beverages', 4, true),
('Bia & Rượu', 'ビール＆酒', 'Beer & Alcohol', 5, true),
('Tạp hóa', '食料品', 'Grocery', 6, true);

-- ===== PRODUCTS =====
-- Get category IDs
DO $$
DECLARE
    cat_pho UUID;
    cat_com UUID;
    cat_khaivi UUID;
    cat_douong UUID;
    cat_bia UUID;
    cat_taphoa UUID;
BEGIN
    SELECT id INTO cat_pho FROM categories WHERE name_vi = 'Phở & Bún';
    SELECT id INTO cat_com FROM categories WHERE name_vi = 'Cơm';
    SELECT id INTO cat_khaivi FROM categories WHERE name_vi = 'Món khai vị';
    SELECT id INTO cat_douong FROM categories WHERE name_vi = 'Đồ uống';
    SELECT id INTO cat_bia FROM categories WHERE name_vi = 'Bia & Rượu';
    SELECT id INTO cat_taphoa FROM categories WHERE name_vi = 'Tạp hóa';

    -- Phở & Bún (display_in_kitchen = true)
    INSERT INTO products (category_id, sku, name_vi, name_ja, name_en, price, display_in_kitchen, is_available, sort_order) VALUES
    (cat_pho, 'PHO001', 'Phở bò tái', '牛肉フォー（レア）', 'Beef Pho (Rare)', 900, true, true, 1),
    (cat_pho, 'PHO002', 'Phở bò chín', '牛肉フォー（ウェルダン）', 'Beef Pho (Well-done)', 900, true, true, 2),
    (cat_pho, 'PHO003', 'Phở gà', 'チキンフォー', 'Chicken Pho', 850, true, true, 3),
    (cat_pho, 'BUN001', 'Bún bò Huế', 'ブンボーフエ', 'Hue Beef Noodle', 950, true, true, 4),
    (cat_pho, 'BUN002', 'Bún chả Hà Nội', 'ブンチャーハノイ', 'Hanoi Grilled Pork Noodle', 1000, true, true, 5);

    -- Cơm (display_in_kitchen = true)
    INSERT INTO products (category_id, sku, name_vi, name_ja, name_en, price, display_in_kitchen, is_available, sort_order) VALUES
    (cat_com, 'COM001', 'Cơm sườn nướng', '焼きポークチョップご飯', 'Grilled Pork Chop Rice', 950, true, true, 1),
    (cat_com, 'COM002', 'Cơm gà xối mỡ', 'フライドチキンご飯', 'Crispy Chicken Rice', 900, true, true, 2),
    (cat_com, 'COM003', 'Cơm tấm bì chả', 'コムタム特製', 'Broken Rice Special', 1000, true, true, 3);

    -- Món khai vị (display_in_kitchen = true)
    INSERT INTO products (category_id, sku, name_vi, name_ja, name_en, price, display_in_kitchen, is_available, sort_order) VALUES
    (cat_khaivi, 'KV001', 'Chả giò', '揚げ春巻き', 'Fried Spring Rolls', 500, true, true, 1),
    (cat_khaivi, 'KV002', 'Gỏi cuốn', '生春巻き', 'Fresh Spring Rolls', 450, true, true, 2),
    (cat_khaivi, 'KV003', 'Bánh xèo', 'バインセオ', 'Vietnamese Crepe', 700, true, true, 3);

    -- Đồ uống (display_in_kitchen = false - không cần báo bếp)
    INSERT INTO products (category_id, sku, name_vi, name_ja, name_en, price, display_in_kitchen, is_available, sort_order) VALUES
    (cat_douong, 'DU001', 'Trà đá', 'アイスティー', 'Iced Tea', 100, false, true, 1),
    (cat_douong, 'DU002', 'Cà phê sữa đá', 'ベトナムコーヒー', 'Vietnamese Iced Coffee', 350, false, true, 2),
    (cat_douong, 'DU003', 'Nước ngọt', 'ソフトドリンク', 'Soft Drink', 200, false, true, 3),
    (cat_douong, 'DU004', 'Nước suối', 'ミネラルウォーター', 'Mineral Water', 150, false, true, 4);

    -- Bia & Rượu (display_in_kitchen = false)
    INSERT INTO products (category_id, sku, name_vi, name_ja, name_en, price, display_in_kitchen, is_available, sort_order) VALUES
    (cat_bia, 'BIA001', 'Bia Sapporo', 'サッポロビール', 'Sapporo Beer', 500, false, true, 1),
    (cat_bia, 'BIA002', 'Bia Asahi', 'アサヒビール', 'Asahi Beer', 500, false, true, 2),
    (cat_bia, 'BIA003', 'Bia 333', 'ビール333', '333 Beer', 400, false, true, 3),
    (cat_bia, 'RUOU001', 'Rượu Sake', '日本酒', 'Sake', 800, false, true, 4);

    -- Tạp hóa (display_in_kitchen = false)
    INSERT INTO products (category_id, sku, name_vi, name_ja, name_en, price, display_in_kitchen, is_available, sort_order) VALUES
    (cat_taphoa, 'TH001', 'Mì gói Hảo Hảo', 'ハオハオ麺', 'Hao Hao Instant Noodle', 150, false, true, 1),
    (cat_taphoa, 'TH002', 'Nước mắm Phú Quốc', 'フーコック魚醤', 'Phu Quoc Fish Sauce', 800, false, true, 2),
    (cat_taphoa, 'TH003', 'Bánh tráng', 'ライスペーパー', 'Rice Paper', 300, false, true, 3),
    (cat_taphoa, 'TH004', 'Phở khô', '乾燥フォー麺', 'Dried Pho Noodle', 250, false, true, 4);
END $$;

-- ===== TABLES =====
INSERT INTO tables (number, name, capacity, status, position_x, position_y) VALUES
(1, 'Bàn 1', 4, 'available', 0, 0),
(2, 'Bàn 2', 4, 'available', 1, 0),
(3, 'Bàn 3', 4, 'available', 2, 0),
(4, 'Bàn 4', 4, 'available', 3, 0),
(5, 'Bàn 5', 4, 'available', 4, 0),
(6, 'Bàn 6', 6, 'available', 0, 1),
(7, 'Bàn 7', 6, 'available', 1, 1),
(8, 'Bàn 8', 6, 'available', 2, 1),
(9, 'Bàn 9', 4, 'available', 3, 1),
(10, 'Bàn 10', 4, 'available', 4, 1),
(11, 'Bàn VIP 1', 8, 'available', 0, 2),
(12, 'Bàn VIP 2', 8, 'available', 1, 2),
(13, 'Bàn ngoài 1', 4, 'available', 2, 2),
(14, 'Bàn ngoài 2', 4, 'available', 3, 2),
(15, 'Quầy bar', 2, 'available', 4, 2);

-- ===== BILL TEMPLATE =====
INSERT INTO bill_templates (name, header_text, footer_text, show_logo, font_size, is_active) VALUES
('Default', '🍜 Quán Việt Nam
Cảm ơn quý khách!', 'Hẹn gặp lại quý khách!
★★★★★', true, 'medium', true);

-- ===== SAMPLE PROMOTION =====
INSERT INTO promotions (name, type, value, start_date, end_date, is_active) VALUES
('Giảm 10% cuối tuần', 'percent', 10, '2026-01-01', '2026-12-31', true),
('Giảm 500 yên đơn > 3000 yên', 'fixed', 500, '2026-01-01', '2026-12-31', true);
