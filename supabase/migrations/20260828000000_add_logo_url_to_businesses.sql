-- Migration: Add logo_url to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
