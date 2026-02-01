-- Migration: Create table_sessions
-- This table tracks active dining sessions at each table

CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(64) UNIQUE NOT NULL,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    customer_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup of active sessions by table
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_token ON table_sessions(session_token);

-- Only one active session per table at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_sessions_active_table 
ON table_sessions(table_id) 
WHERE status = 'active';

COMMENT ON TABLE table_sessions IS 'Tracks dining sessions for QR code table ordering';
COMMENT ON COLUMN table_sessions.order_id IS 'The main order associated with this table session';
COMMENT ON COLUMN table_sessions.status IS 'Session status: active (currently dining) or completed (finished and paid)';

