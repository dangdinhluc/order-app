-- Clean up any partially created tables and run fresh migrations
DROP TABLE IF EXISTS kitchen_ticket_items CASCADE;
DROP TABLE IF EXISTS kitchen_tickets CASCADE;
DROP TABLE IF EXISTS table_sessions CASCADE;

-- Remove from migrations table so they can re-run
DELETE FROM migrations WHERE name IN (
    '020_table_sessions.sql',
    '021_kitchen_tickets.sql',
    '022_kitchen_ticket_items.sql',
    '023_orders_add_session_id.sql'
);
