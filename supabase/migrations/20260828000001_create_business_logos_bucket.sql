-- Migration: Create business-logos Storage Bucket & Public Access Policies Safely

CREATE SCHEMA IF NOT EXISTS storage;

-- 1. Create public storage bucket for business logos if storage.buckets table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'buckets'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('business-logos', 'business-logos', true)
        ON CONFLICT (id) DO UPDATE SET public = true;
    END IF;
END $$;

-- 2. Create Storage Access Policies if storage.objects table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'objects'
    ) THEN
        DROP POLICY IF EXISTS "Public Read Access for business-logos" ON storage.objects;
        CREATE POLICY "Public Read Access for business-logos"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'business-logos');

        DROP POLICY IF EXISTS "Authenticated Insert Access for business-logos" ON storage.objects;
        CREATE POLICY "Authenticated Insert Access for business-logos"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'business-logos');

        DROP POLICY IF EXISTS "Authenticated Update Access for business-logos" ON storage.objects;
        CREATE POLICY "Authenticated Update Access for business-logos"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'business-logos');
    END IF;
END $$;
