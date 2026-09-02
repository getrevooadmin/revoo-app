-- Migration: Add feedback incentive promo fields to loyalty_campaigns and interactions
ALTER TABLE loyalty_campaigns ADD COLUMN IF NOT EXISTS feedback_promo_enabled BOOLEAN DEFAULT true;
ALTER TABLE loyalty_campaigns ADD COLUMN IF NOT EXISTS feedback_multiplier NUMERIC(5,2) DEFAULT 2.0;

ALTER TABLE interactions ADD COLUMN IF NOT EXISTS feedback_promo_applied BOOLEAN DEFAULT false;
