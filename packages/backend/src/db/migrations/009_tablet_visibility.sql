-- Add is_tablet_visible column to categories and products

ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_tablet_visible BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_tablet_visible BOOLEAN DEFAULT true;

-- Update existing records to have true (already handled by DEFAULT, but good to be explicit if needed, though Postgres DEFAULT applies to new rows and existing rows if NOT NULL and default provided, here nullable so it's fine)
-- Actually, adding column with DEFAULT fills existing rows.
