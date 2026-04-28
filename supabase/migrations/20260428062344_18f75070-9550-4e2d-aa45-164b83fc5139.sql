
-- Helper: returns true if platform admin has an active impersonation session
CREATE OR REPLACE FUNCTION public.is_impersonating(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admin_sessions
    WHERE user_id = _user_id AND expires_at > now()
  )
$$;

-- PROFILES: replace permissive platform-admin SELECT with one that respects impersonation
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- Platform admins NOT impersonating can see all profiles (for /platform dashboard)
CREATE POLICY "Platform admins can view all profiles when not impersonating"
ON public.profiles FOR SELECT TO authenticated
USING (
  is_platform_admin(auth.uid())
  AND NOT is_impersonating(auth.uid())
);

-- USER_ROLES: same fix
DROP POLICY IF EXISTS "Admins can view tenant user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage tenant user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can view tenant user roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.tenant_id = get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Admins can manage tenant user roles"
ON public.user_roles FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.tenant_id = get_user_tenant_id(auth.uid())
  )
)
WITH CHECK (
  is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.tenant_id = get_user_tenant_id(auth.uid())
  )
);

-- Platform admins NOT impersonating can manage all roles (for /platform)
CREATE POLICY "Platform admins manage all roles when not impersonating"
ON public.user_roles FOR ALL TO authenticated
USING (is_platform_admin(auth.uid()) AND NOT is_impersonating(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()) AND NOT is_impersonating(auth.uid()));
