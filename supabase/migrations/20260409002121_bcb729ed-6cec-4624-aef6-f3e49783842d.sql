-- Security definer function: check if user is platform_admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'platform_admin'
  )
$$;

-- Update role escalation prevention to include platform_admin
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'platform_admin' AND NOT is_platform_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only platform_admins can assign platform_admin role';
  END IF;
  IF NEW.role = 'super_admin' AND NOT (has_role(auth.uid(), 'super_admin') OR is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only super_admins or platform_admins can assign super_admin role';
  END IF;
  RETURN NEW;
END;
$$;

-- RLS policies on tenants table for platform admin
CREATE POLICY "Platform admins can manage all tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant users can view own tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (user_in_tenant(auth.uid(), id));

-- Allow platform admins to view all profiles (cross-tenant)
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Allow platform admins to manage all user_roles
CREATE POLICY "Platform admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));