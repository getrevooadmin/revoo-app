-- Migration: Allow decimal values for points_per_value_unit and points_earned
ALTER TABLE loyalty_campaigns ALTER COLUMN points_per_value_unit TYPE NUMERIC(10,4);
ALTER TABLE interactions ALTER COLUMN points_earned TYPE NUMERIC(10,2);
