ALTER TABLE categories
ADD COLUMN display_in_menu BOOLEAN DEFAULT true,
ADD COLUMN display_in_pos BOOLEAN DEFAULT true,
ADD COLUMN display_in_kiosk BOOLEAN DEFAULT true;
