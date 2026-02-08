-- Migration: Add Hybrid Sync Triggers
-- Description: Notifies listeners (backend instances) when orders or items are created/updated.

-- 1. Create the notification function
CREATE OR REPLACE FUNCTION notify_order_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    row_data JSONB;
BEGIN
    -- Handle DELETE vs INSERT/UPDATE
    IF (TG_OP = 'DELETE') THEN
        row_data = to_jsonb(OLD);
    ELSE
        row_data = to_jsonb(NEW);
    END IF;

    -- Choose ID (order_id for items, id for orders) safely
    payload = jsonb_build_object(
        'id', COALESCE(row_data->>'order_id', row_data->>'id'),
        'table_name', TG_TABLE_NAME,
        'action', TG_OP,
        'timestamp', NOW()
    );

    -- Perform NOTIFY
    PERFORM pg_notify('order_updates', payload::text);
    
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create triggers for orders table
DROP TRIGGER IF EXISTS trigger_order_change ON orders;
CREATE TRIGGER trigger_order_change
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_change();

-- 3. Create triggers for order_items table
DROP TRIGGER IF EXISTS trigger_order_item_change ON order_items;
CREATE TRIGGER trigger_order_item_change
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION notify_order_change();

-- 4. Create table for offline synchronization tracking (Outbox)
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID NOT NULL, -- The relative ID on the local machine
    table_name VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, syncing, synced, failed
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE
);
