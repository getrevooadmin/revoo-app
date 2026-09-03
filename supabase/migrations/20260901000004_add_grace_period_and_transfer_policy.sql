-- Migration: Add grace period and unredeemed points policy to loyalty_campaigns
ALTER TABLE loyalty_campaigns DROP CONSTRAINT IF EXISTS loyalty_campaigns_status_check;
ALTER TABLE loyalty_campaigns ADD CONSTRAINT loyalty_campaigns_status_check CHECK (status IN ('active', 'grace_period', 'inactive', 'closed'));

ALTER TABLE loyalty_campaigns ADD COLUMN IF NOT EXISTS grace_period_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE loyalty_campaigns ADD COLUMN IF NOT EXISTS unredeemed_points_policy VARCHAR(20) DEFAULT 'expire' CHECK (unredeemed_points_policy IN ('expire', 'transfer'));
ALTER TABLE loyalty_campaigns ADD COLUMN IF NOT EXISTS grace_period_announcement TEXT;
