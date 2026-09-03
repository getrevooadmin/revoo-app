-- Migration: Add expired and cancelled to interactions status check constraint
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_status_check;
ALTER TABLE interactions ADD CONSTRAINT interactions_status_check CHECK (status IN ('accumulated', 'redimidos', 'spam_hidden', 'expired', 'cancelled'));
