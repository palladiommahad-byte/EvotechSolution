-- Add check serial/number to invoices
-- Safe to run multiple times

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS check_number VARCHAR(100);

-- Optional: keep data consistent (only checks can have a check number)
-- Uncomment if you want strict enforcement:
-- ALTER TABLE invoices
--   ADD CONSTRAINT invoices_check_number_requires_check_payment_method
--   CHECK (payment_method = 'check' OR check_number IS NULL);

