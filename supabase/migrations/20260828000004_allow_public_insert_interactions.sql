-- Allow anonymous/consumer inserting of interaction records for feedback & point accumulation
DROP POLICY IF EXISTS "Anyone can insert interactions" ON public.interactions;
CREATE POLICY "Anyone can insert interactions" 
ON public.interactions FOR INSERT 
WITH CHECK (true);
