-- Migration: 007_table_areas_v2
-- Description: Update areas table with more fields

-- Add new columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'name_vi') THEN
        ALTER TABLE areas ADD COLUMN name_vi VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'name_ja') THEN
        ALTER TABLE areas ADD COLUMN name_ja VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'color') THEN
        ALTER TABLE areas ADD COLUMN color VARCHAR(20) DEFAULT 'slate';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'areas' AND column_name = 'is_active') THEN
        ALTER TABLE areas ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Migrate data
UPDATE areas SET name_vi = name WHERE name_vi IS NULL;

-- Set specific colors for existing areas
UPDATE areas SET color = 'purple' WHERE name ILIKE '%VIP%';
UPDATE areas SET color = 'green' WHERE name ILIKE '%Sân%' OR name ILIKE '%Garden%' OR name ILIKE '%ngoài%';
UPDATE areas SET color = 'blue' WHERE name ILIKE '%Sảnh%' OR name ILIKE '%Main%';
