-- Migration: Fix Hybrid Sync Triggers
-- Description: Overwrites the faulty notify_order_change function to safely handle different table structures.

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

    -- Choose ID (order_id for items, id for orders) safely using JSONB access
    -- This avoids "record x has no field y" errors during compilation
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
