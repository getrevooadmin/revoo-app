-- Create user_role type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('merchant', 'consumer', 'admin');
    END IF;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'consumer',
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    phone VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT chk_merchant_has_business CHECK (
        (role = 'merchant' AND business_id IS NOT NULL) OR
        (role != 'merchant')
    )
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_time_codes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- 1. Profiles Policies
CREATE POLICY "Users can select their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "System can insert profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (true); -- Allows API server/triggers to create profiles

-- 2. Businesses Policies
CREATE POLICY "Merchants can select their business" 
ON public.businesses FOR SELECT 
USING (
    id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Merchants can update their business" 
ON public.businesses FOR UPDATE 
USING (
    id = (SELECT business_id FROM public.profiles WHERE id = auth.uid() AND role = 'merchant')
);

CREATE POLICY "System can insert businesses" 
ON public.businesses FOR INSERT 
WITH CHECK (true);

-- 3. Campaigns Policies
CREATE POLICY "Merchants can manage their campaigns" 
ON public.loyalty_campaigns FOR ALL 
USING (
    business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid() AND role = 'merchant')
);

CREATE POLICY "Everyone can select active campaigns" 
ON public.loyalty_campaigns FOR SELECT 
USING (true); -- Both merchants and consumers need to read campaigns

-- 4. Interactions Policies
CREATE POLICY "Merchants can read their business interactions" 
ON public.interactions FOR SELECT 
USING (
    business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid() AND role = 'merchant')
);

CREATE POLICY "Consumers can read their own interactions" 
ON public.interactions FOR SELECT 
USING (
    customer_phone = (SELECT phone FROM public.profiles WHERE id = auth.uid() AND role = 'consumer')
);

CREATE POLICY "Anyone can insert interactions" 
ON public.interactions FOR INSERT 
WITH CHECK (true); -- Needed for anonymous feedback submissions

-- 5. One Time Codes Policies
CREATE POLICY "Merchants can manage their business codes" 
ON public.one_time_codes FOR ALL 
USING (
    business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid() AND role = 'merchant')
);

-- Grant privileges to Supabase api roles for all tables, sequences, and functions in schema public
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- Ensure future tables, sequences, and functions in public schema inherit these privileges automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role, anon, authenticated;
