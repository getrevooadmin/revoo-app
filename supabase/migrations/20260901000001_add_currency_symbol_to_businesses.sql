-- Add currency_symbol column to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(20) NOT NULL DEFAULT '$';
