DROP POLICY IF EXISTS "Public can view active positions" ON public.positions;

CREATE POLICY "Users can view active positions in their tenant"
ON public.positions
FOR SELECT
USING (
  is_active = true
  AND (
    tenant_id = public.get_user_tenant_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  )
);