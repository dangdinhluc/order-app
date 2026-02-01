-- Clean all order-related data
-- Run this to reset the database for testing

BEGIN;

-- Delete in correct order (respecting foreign keys)
DELETE FROM kitchen_ticket_items;
DELETE FROM kitchen_tickets;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM table_sessions;

-- Reset sequences if any (optional)
-- This ensures next order IDs start fresh

COMMIT;
