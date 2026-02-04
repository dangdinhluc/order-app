-- Migration: Add table_session_id to orders table
-- Links orders to table sessions (already exists in schema, this is a safety check)

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS table_session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_table_session_id ON orders(table_session_id);

COMMENT ON COLUMN orders.session_id IS 'Links this order to a table session (new model)';
