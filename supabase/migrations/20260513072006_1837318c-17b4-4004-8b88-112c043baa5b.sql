DROP POLICY IF EXISTS "Users can view active positions in their tenant" ON public.positions;

CREATE POLICY "Users can view active positions in their tenant"
ON public.positions
FOR SELECT
USING (
  is_active = true
  AND tenant_id = get_user_tenant_id(auth.uid())
);