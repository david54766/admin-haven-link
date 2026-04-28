-- Restore public listing of centers for signup/apply forms (non-sensitive metadata)
CREATE POLICY "Public can view centers"
ON public.centers FOR SELECT TO anon, authenticated
USING (true);

-- Drop the now-redundant authenticated-only policy
DROP POLICY IF EXISTS "Approved users can view centers" ON public.centers;