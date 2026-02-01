-- Migration: Create kitchen_ticket_items
-- Links kitchen tickets to specific order items

CREATE TABLE IF NOT EXISTS kitchen_ticket_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_ticket_id ON kitchen_ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_order_item_id ON kitchen_ticket_items(order_item_id);

COMMENT ON TABLE kitchen_ticket_items IS 'Links kitchen tickets to order items';
COMMENT ON COLUMN kitchen_ticket_items.quantity IS 'How many of this item in this specific ticket';
