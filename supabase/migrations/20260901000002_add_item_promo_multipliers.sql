-- Migration: Add promo multiplier and promo amount support to one_time_codes and interactions
ALTER TABLE one_time_codes ADD COLUMN IF NOT EXISTS multiplier NUMERIC(5,2) DEFAULT 1.0;
ALTER TABLE one_time_codes ADD COLUMN IF NOT EXISTS item_promo_name VARCHAR(255);
ALTER TABLE one_time_codes ADD COLUMN IF NOT EXISTS promo_amount NUMERIC(10,2);

ALTER TABLE interactions ADD COLUMN IF NOT EXISTS multiplier NUMERIC(5,2) DEFAULT 1.0;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS item_promo_name VARCHAR(255);
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS promo_amount NUMERIC(10,2);
