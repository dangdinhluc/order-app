-- Migration: Create kitchen_tickets
-- This table tracks individual "sends to kitchen" within a single order

CREATE TABLE IF NOT EXISTS kitchen_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_number INTEGER, -- Sequential number within this order
    sent_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'cooking', 'served', 'cancelled')),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup by order
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order_id ON kitchen_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status ON kitchen_tickets(status);

COMMENT ON TABLE kitchen_tickets IS 'Individual kitchen tickets within a single order session';
COMMENT ON COLUMN kitchen_tickets.ticket_number IS 'Sequential number (1, 2, 3...) for this order';
COMMENT ON COLUMN kitchen_tickets.status IS 'Ticket status: pending, cooking, served, or cancelled';
