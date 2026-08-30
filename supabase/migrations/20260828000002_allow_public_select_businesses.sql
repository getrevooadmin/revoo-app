
-- Allow public/anonymous reading of businesses for consumer portal selection
DROP POLICY IF EXISTS "Everyone can view businesses" ON public.businesses;
CREATE POLICY "Everyone can view businesses" 
ON public.businesses FOR SELECT 
USING (true);
