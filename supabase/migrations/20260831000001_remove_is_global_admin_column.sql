-- 1. Ensure permissions catalog contains 'global_admin'
INSERT INTO public.permissions (id, name, description) VALUES
    ('global_admin', 'Administrador Global', 'Acceso total y configuración del comercio sin restricciones')
ON CONFLICT (id) DO NOTHING;

-- 2. Create 'Administrador Global' system role for any business that doesn't have one
INSERT INTO public.roles (business_id, name, description, is_system)
SELECT b.id, 'Administrador Global', 'Acceso total y configuración del comercio', true
FROM public.businesses b
WHERE NOT EXISTS (
    SELECT 1 FROM public.roles r 
    WHERE r.business_id = b.id AND r.is_system = true
);

-- 3. Assign SINGLE 'global_admin' permission to all system roles
-- (Global Admins only need 1 record in role_permissions)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, 'global_admin'
FROM public.roles r
WHERE r.is_system = true
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Link existing merchant profiles to their business's system role
UPDATE public.profiles p
SET custom_role_id = r.id
FROM public.roles r
WHERE p.business_id = r.business_id 
  AND r.is_system = true
  AND (p.custom_role_id IS NULL OR p.role = 'merchant');

-- 5. Safely drop legacy is_global_admin column
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS is_global_admin;
