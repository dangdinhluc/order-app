-- Migration: Add session_id to orders table
-- Links orders to table sessions for the new single-order-per-table model

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);

COMMENT ON COLUMN orders.session_id IS 'Links this order to a table session (new model)';
