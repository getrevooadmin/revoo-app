-- Allow reading active purchase codes for consumer portal point accumulation
DROP POLICY IF EXISTS "Everyone can view active codes" ON public.one_time_codes;
CREATE POLICY "Everyone can view active codes" 
ON public.one_time_codes FOR SELECT 
USING (true);
