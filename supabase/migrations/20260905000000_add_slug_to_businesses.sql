-- Migration: Add unique human-readable slug / identifier to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Backfill existing businesses with a sanitized lowercase slug based on their name
UPDATE public.businesses
SET slug = LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9_-]+', '', 'g'))
WHERE slug IS NULL;

-- In case any slug ended up empty or null, fallback to id substring
UPDATE public.businesses
SET slug = 'comercio-' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE slug IS NULL OR slug = '';

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses (LOWER(slug));

-- Set slug to NOT NULL
ALTER TABLE public.businesses ALTER COLUMN slug SET NOT NULL;
