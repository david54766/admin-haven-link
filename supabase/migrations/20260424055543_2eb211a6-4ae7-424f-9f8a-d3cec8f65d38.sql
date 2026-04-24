-- Allow tenant admins to view pending profiles still sitting in the default platform tenant
-- so they can approve (and thereby claim) them. The move-on-approval trigger handles the reassignment.

CREATE POLICY "Tenant admins can view pending platform-tenant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND is_admin(auth.uid())
);

CREATE POLICY "Tenant admins can update pending platform-tenant profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND is_admin(auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
);