-- SQL Snippet to truncate and clean all application tables in local database
TRUNCATE TABLE 
    public.interactions,
    public.one_time_codes,
    public.loyalty_campaigns,
    public.profiles,
    public.role_permissions,
    public.roles,
    public.businesses
CASCADE;

-- Optional: Delete all Supabase Auth users in local development
DELETE FROM auth.users;
