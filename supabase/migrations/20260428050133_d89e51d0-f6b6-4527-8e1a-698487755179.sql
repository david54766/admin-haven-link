CREATE OR REPLACE FUNCTION public.get_tenant_last_logins()
RETURNS TABLE(tenant_id uuid, last_login timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.tenant_id, MAX(u.last_sign_in_at) AS last_login
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE public.is_platform_admin(auth.uid())
  GROUP BY p.tenant_id
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_last_logins() TO authenticated;