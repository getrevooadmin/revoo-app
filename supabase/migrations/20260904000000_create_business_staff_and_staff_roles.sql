-- =====================================================================
-- Migration: Create business_staff & staff_roles
-- Decouples profiles (generic user accounts: consumers & merchants)
-- from business staff memberships and roles.
-- =====================================================================

-- 1. Create business_staff table
CREATE TABLE IF NOT EXISTS public.business_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username VARCHAR(100),
    alias VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unq_business_staff_profile UNIQUE (business_id, profile_id),
    CONSTRAINT unq_business_staff_username UNIQUE (business_id, username)
);

CREATE INDEX IF NOT EXISTS idx_business_staff_business_id ON public.business_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_business_staff_profile_id ON public.business_staff(profile_id);

-- 2. Create staff_roles table (associates staff members with catalog roles)
CREATE TABLE IF NOT EXISTS public.staff_roles (
    staff_id UUID NOT NULL REFERENCES public.business_staff(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (staff_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_roles_role_id ON public.staff_roles(role_id);

-- 3. Data migration from existing profiles and profile_roles (if any exist)
DO $$
BEGIN
    -- Check if business_id exists on profiles before trying to migrate
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'business_id'
    ) THEN
        INSERT INTO public.business_staff (business_id, profile_id, username, alias)
        SELECT p.business_id, p.id, p.username, COALESCE(p.alias, p.full_name)
        FROM public.profiles p
        WHERE p.business_id IS NOT NULL
        ON CONFLICT DO NOTHING;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_roles') THEN
            INSERT INTO public.staff_roles (staff_id, role_id)
            SELECT bs.id, pr.role_id
            FROM public.profile_roles pr
            JOIN public.business_staff bs ON bs.profile_id = pr.profile_id
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- 4. Drop legacy profile_roles table
DROP TABLE IF EXISTS public.profile_roles CASCADE;

-- 5. Update get_auth_user_business_id() to read from business_staff
CREATE OR REPLACE FUNCTION public.get_auth_user_business_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT business_id FROM public.business_staff WHERE profile_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_business_id() TO authenticated, service_role, postgres;

-- 6. Clean up profiles table (remove staff-only columns and constraints)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_merchant_has_business;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS unq_profile_username_business;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS business_id CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS username CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS alias CASCADE;

-- 7. Configure RLS on business_staff
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.business_staff TO postgres, service_role, authenticated;

DROP POLICY IF EXISTS "Staff can read business staff members" ON public.business_staff;
CREATE POLICY "Staff can read business staff members"
ON public.business_staff FOR SELECT
USING (
    profile_id = auth.uid()
    OR business_id = public.get_auth_user_business_id()
);

-- 8. Configure RLS on staff_roles
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.staff_roles TO postgres, service_role, authenticated;

DROP POLICY IF EXISTS "Read staff roles within business" ON public.staff_roles;
CREATE POLICY "Read staff roles within business"
ON public.staff_roles FOR SELECT
USING (
    staff_id IN (
        SELECT id FROM public.business_staff
        WHERE business_id = public.get_auth_user_business_id()
           OR profile_id = auth.uid()
    )
);

-- 9. Update profiles RLS policy
DROP POLICY IF EXISTS "Merchants can read business profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by owner or same business staff" ON public.profiles;

CREATE POLICY "Profiles readable by owner or same business staff"
ON public.profiles FOR SELECT
USING (
    id = auth.uid()
    OR id IN (
        SELECT bs_other.profile_id
        FROM public.business_staff bs_other
        WHERE bs_other.business_id = public.get_auth_user_business_id()
    )
);

-- 10. Update business-scoped policies to use get_auth_user_business_id()
DROP POLICY IF EXISTS "Merchants can update own business" ON public.businesses;
CREATE POLICY "Staff can update own business"
ON public.businesses FOR UPDATE
USING (id = public.get_auth_user_business_id());

DROP POLICY IF EXISTS "Merchants can manage campaigns" ON public.loyalty_campaigns;
CREATE POLICY "Staff can manage campaigns"
ON public.loyalty_campaigns FOR ALL
USING (business_id = public.get_auth_user_business_id());

DROP POLICY IF EXISTS "Merchants can manage codes" ON public.one_time_codes;
CREATE POLICY "Staff can manage codes"
ON public.one_time_codes FOR ALL
USING (business_id = public.get_auth_user_business_id());
