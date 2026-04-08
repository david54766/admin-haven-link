-- Allow public (unauthenticated) read access to centers for registration forms
CREATE POLICY "Public can view centers"
ON public.centers
FOR SELECT
USING (true);