-- Fix UTF-8 encoding for user names
-- Update owner user name to ensure proper encoding
UPDATE users SET name = 'Chủ quán' WHERE role = 'owner';
UPDATE users SET name = 'Thu ngân' WHERE role = 'cashier';  
UPDATE users SET name = 'Bếp trưởng' WHERE role = 'kitchen';

-- Verify
SELECT id, name, email, role FROM users;
