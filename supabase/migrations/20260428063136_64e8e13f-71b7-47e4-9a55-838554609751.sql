
DROP POLICY IF EXISTS "Public can view centers" ON public.centers;

-- Anonymous (public application form) still needs to list centers
CREATE POLICY "Anon can view centers"
ON public.centers FOR SELECT TO anon
USING (true);

-- Authenticated users only see centers within their (acting) tenant
CREATE POLICY "Authenticated users view own tenant centers"
ON public.centers FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));
