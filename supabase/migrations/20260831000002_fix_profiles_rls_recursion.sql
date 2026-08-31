-- Fix RLS Infinite Recursion on public.profiles

-- 1. Create SECURITY DEFINER function to retrieve user's business_id without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_auth_user_business_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT business_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_user_business_id() TO authenticated, service_role, postgres;

-- 2. Drop old policy causing infinite recursion
DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Merchants can read business profiles" ON public.profiles;

-- 3. Create non-recursive policy for public.profiles
CREATE POLICY "Merchants can read business profiles"
ON public.profiles FOR SELECT
USING (
    id = auth.uid() 
    OR 
    business_id = public.get_auth_user_business_id()
);
