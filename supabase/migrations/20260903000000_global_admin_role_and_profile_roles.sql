-- =====================================================================
-- Global Admin default role + profile_roles (profile -> many roles)
-- Roles are global catalogs and do NOT belong to a specific business.
-- =====================================================================

-- 1. Drop legacy business-scoped policies on roles and role_permissions FIRST
DROP POLICY IF EXISTS "Merchants can read business roles" ON public.roles;
DROP POLICY IF EXISTS "Merchants can insert business roles" ON public.roles;
DROP POLICY IF EXISTS "Merchants can update business roles" ON public.roles;
DROP POLICY IF EXISTS "Merchants can delete non-system business roles" ON public.roles;
DROP POLICY IF EXISTS "Merchants can manage role permissions" ON public.role_permissions;

-- 2. Remove business_id and its foreign key from roles table
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_business_id_fkey;
ALTER TABLE public.roles DROP COLUMN IF EXISTS business_id CASCADE;

-- 3. Define clean policies for roles & role_permissions (idempotent)
DROP POLICY IF EXISTS "Roles readable by authenticated users" ON public.roles;
CREATE POLICY "Roles readable by authenticated users"
ON public.roles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create custom roles" ON public.roles;
CREATE POLICY "Authenticated users can create custom roles"
ON public.roles FOR INSERT
WITH CHECK (is_system = false);

DROP POLICY IF EXISTS "Authenticated users can update non-system roles" ON public.roles;
CREATE POLICY "Authenticated users can update non-system roles"
ON public.roles FOR UPDATE
USING (is_system = false);

DROP POLICY IF EXISTS "Authenticated users can delete non-system roles" ON public.roles;
CREATE POLICY "Authenticated users can delete non-system roles"
ON public.roles FOR DELETE
USING (is_system = false);

DROP POLICY IF EXISTS "Authenticated users can manage role permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can manage role permissions"
ON public.role_permissions FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Seed the default "Administrador Global" system role
INSERT INTO public.roles (id, name, description, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Administrador Global',
    'Acceso total y configuración del comercio',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Grant all permissions to the Global Admin role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
FROM public.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Create profile_roles join table (one-to-many / many-to-many)
CREATE TABLE IF NOT EXISTS public.profile_roles (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (profile_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_roles_role_id ON public.profile_roles(role_id);

ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.profile_roles TO postgres, service_role, authenticated;

-- Users can read role assignments of accounts within their business
DROP POLICY IF EXISTS "Read profile roles within business" ON public.profile_roles;
CREATE POLICY "Read profile roles within business"
ON public.profile_roles FOR SELECT
USING (
    profile_id = auth.uid()
    OR profile_id IN (
        SELECT id FROM public.profiles WHERE business_id = public.get_auth_user_business_id()
    )
);

-- 6. Drop legacy custom_role_id from profiles (replaced by profile_roles)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS custom_role_id;
