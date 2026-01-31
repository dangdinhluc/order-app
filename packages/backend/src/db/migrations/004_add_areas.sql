-- Create areas table
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default areas
INSERT INTO areas (name, sort_order) VALUES
('Sảnh chính', 1),
('Phòng VIP', 2),
('Sân ngoài', 3),
('Quầy Bar', 4);

-- Add area_id to tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id);

-- Migrate existing tables
DO $$
DECLARE
    area_main UUID;
    area_vip UUID;
    area_garden UUID;
    area_bar UUID;
BEGIN
    SELECT id INTO area_main FROM areas WHERE name = 'Sảnh chính';
    SELECT id INTO area_vip FROM areas WHERE name = 'Phòng VIP';
    SELECT id INTO area_garden FROM areas WHERE name = 'Sân ngoài';
    SELECT id INTO area_bar FROM areas WHERE name = 'Quầy Bar';

    -- Update tables based on name patterns
    UPDATE tables SET area_id = area_vip WHERE name ILIKE '%VIP%';
    UPDATE tables SET area_id = area_garden WHERE name ILIKE '%ngoài%';
    UPDATE tables SET area_id = area_bar WHERE name ILIKE '%bar%';
    
    -- Default others to Main Hall
    UPDATE tables SET area_id = area_main WHERE area_id IS NULL;
END $$;
