-- Allow public/anonymous reading of interaction records for point calculation and RETURNING * clauses
DROP POLICY IF EXISTS "Anyone can read interactions" ON public.interactions;
CREATE POLICY "Anyone can read interactions" 
ON public.interactions FOR SELECT 
USING (true);

-- Allow public/anonymous updating of one_time_codes when associating codes
DROP POLICY IF EXISTS "Everyone can update active codes" ON public.one_time_codes;
CREATE POLICY "Everyone can update active codes" 
ON public.one_time_codes FOR UPDATE 
USING (true)
WITH CHECK (true);
