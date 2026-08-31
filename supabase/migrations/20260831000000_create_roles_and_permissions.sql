-- Create permissions catalog table
CREATE TABLE IF NOT EXISTS public.permissions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Populate standard catalog permissions
INSERT INTO public.permissions (id, name, description) VALUES
    ('global_admin', 'Administrador Global', 'Acceso total y configuración del comercio sin restricciones'),
    ('manage_roles', 'Configurar Roles y Permisos', 'Crear, editar y administrar permisos del sistema'),
    ('manage_users', 'Crear y Asignar Cuentas', 'Crear cuentas de colaboradores con usuario y contraseña'),
    ('manage_campaigns', 'Administrar Campañas', 'Crear, activar y pausar campañas de fidelización'),
    ('generate_codes', 'Generar Códigos / QR', 'Generar códigos de compra para acumulación de puntos'),
    ('redeem_prizes', 'Canje Directo de Premios', 'Consultar saldo y validar PIN de 4 dígitos para canjes'),
    ('view_analytics', 'Ver Métricas e Histórico', 'Visualizar tabla de interacciones y reportes de uso'),
    ('manage_settings', 'Perfil del Comercio', 'Modificar nombre comercial, logo y ajustes del negocio')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create role_permissions table linking roles and permissions catalog
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- Update profiles table with username, alias, custom_role_id
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username VARCHAR(100),
ADD COLUMN IF NOT EXISTS alias VARCHAR(255),
ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- Add constraint for unique username per business
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unq_profile_username_business'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT unq_profile_username_business UNIQUE (business_id, username);
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Grant access to api roles
GRANT ALL ON public.permissions TO postgres, service_role, anon, authenticated;
GRANT ALL ON public.roles TO postgres, service_role, anon, authenticated;
GRANT ALL ON public.role_permissions TO postgres, service_role, anon, authenticated;

-- Policy for permissions catalog (readable by everyone authenticated)
CREATE POLICY "Permissions catalog readable by authenticated users"
ON public.permissions FOR SELECT
USING (true);

-- Policies for roles
CREATE POLICY "Merchants can read business roles" 
ON public.roles FOR SELECT 
USING (
    business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Merchants can insert business roles" 
ON public.roles FOR INSERT 
WITH CHECK (
    business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Merchants can update business roles" 
ON public.roles FOR UPDATE 
USING (
    business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Merchants can delete non-system business roles" 
ON public.roles FOR DELETE 
USING (
    business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()) AND is_system = false
);

-- Policies for role_permissions
CREATE POLICY "Everyone authenticated can read role permissions"
ON public.role_permissions FOR SELECT
USING (true);

CREATE POLICY "Merchants can manage role permissions"
ON public.role_permissions FOR ALL
USING (
    role_id IN (SELECT id FROM public.roles WHERE business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()))
);
