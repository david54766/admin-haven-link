DROP POLICY IF EXISTS "Admins can view all tracks" ON public.training_tracks;

CREATE POLICY "Admins can view tracks in their tenant"
ON public.training_tracks
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));