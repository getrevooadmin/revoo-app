-- Migration: Create business-logos Storage Bucket & Public Access Policies

-- 1. Create public storage bucket for business logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public read access to business-logos objects
DROP POLICY IF EXISTS "Public Read Access for business-logos" ON storage.objects;
CREATE POLICY "Public Read Access for business-logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- 3. Allow authenticated users to insert & update business-logos objects
DROP POLICY IF EXISTS "Authenticated Insert Access for business-logos" ON storage.objects;
CREATE POLICY "Authenticated Insert Access for business-logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-logos');

DROP POLICY IF EXISTS "Authenticated Update Access for business-logos" ON storage.objects;
CREATE POLICY "Authenticated Update Access for business-logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-logos');
