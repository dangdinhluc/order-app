-- Migration: Fix payment method constraint
-- Description: Drop the hardcoded CHECK constraint on payments.method to allow dynamic payment methods from payment_methods table

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
