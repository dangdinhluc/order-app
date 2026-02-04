-- Migration: Add current_order_id to tables
-- Created: 2026-02-02
-- Purpose: Track active order for each table to support QR ordering and real-time POS updates

-- Add current_order_id column to tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS current_order_id UUID;

-- Add foreign key constraint
ALTER TABLE tables 
    ADD CONSTRAINT fk_tables_current_order 
    FOREIGN KEY (current_order_id) 
    REFERENCES orders(id) 
    ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tables_current_order_id ON tables(current_order_id);

-- Update existing occupied tables (if any) to link to their active orders
UPDATE tables t
SET current_order_id = (
    SELECT o.id 
    FROM orders o
    WHERE o.table_id = t.id 
    AND o.status = 'open'
    ORDER BY o.created_at DESC
    LIMIT 1
)
WHERE t.status = 'occupied';
