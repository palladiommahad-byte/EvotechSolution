-- Add check_number column to purchase_invoices table
-- This allows recording check numbers for purchase invoices paid by check

ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS check_number VARCHAR(100);

-- Optional: Add constraint to ensure check_number is only set when payment_method is 'check'
-- Uncomment if you want to enforce this at the database level:
-- ALTER TABLE purchase_invoices
--   ADD CONSTRAINT purchase_invoices_check_number_requires_check_payment_method
--   CHECK (payment_method = 'check' OR check_number IS NULL);
