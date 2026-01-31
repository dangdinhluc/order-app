-- Migration: Add order_type and queue_number for takeaway/retail support
-- Run: docker exec -i order-postgres psql -U postgres -d order_app < migrations/005_order_types.sql

-- Add order_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
        CREATE TYPE order_type AS ENUM ('dine_in', 'takeaway', 'retail');
    END IF;
END$$;

-- Add order_type column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type order_type DEFAULT 'dine_in';

-- Add queue_number for takeaway orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS queue_number INTEGER;

-- Create sequence for queue numbers (resets daily)
CREATE TABLE IF NOT EXISTS queue_counter (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    last_number INTEGER DEFAULT 0
);

-- Function to get next queue number
CREATE OR REPLACE FUNCTION get_next_queue_number()
RETURNS INTEGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    INSERT INTO queue_counter (date, last_number)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date) 
    DO UPDATE SET last_number = queue_counter.last_number + 1
    RETURNING last_number INTO next_num;
    
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Allow null table_id for takeaway/retail orders
ALTER TABLE orders ALTER COLUMN table_id DROP NOT NULL;

-- Index for faster queue lookups
CREATE INDEX IF NOT EXISTS idx_orders_queue ON orders(order_type, queue_number) WHERE order_type = 'takeaway';

COMMENT ON COLUMN orders.order_type IS 'Type of order: dine_in (at table), takeaway (to go), retail (grocery)';
COMMENT ON COLUMN orders.queue_number IS 'Queue number for takeaway orders, resets daily';
