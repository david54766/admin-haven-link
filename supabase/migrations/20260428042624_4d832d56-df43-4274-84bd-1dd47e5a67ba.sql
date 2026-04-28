-- Impersonation session table
CREATE TABLE public.platform_admin_sessions (
  user_id uuid PRIMARY KEY,
  acting_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage own session"
  ON public.platform_admin_sessions
  FOR ALL
  USING (user_id = auth.uid() AND public.is_platform_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_platform_admin(auth.uid()));

-- Audit log
CREATE TABLE public.platform_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins view own audit"
  ON public.platform_admin_audit
  FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins insert audit"
  ON public.platform_admin_audit
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_platform_admin(auth.uid()));

-- Override get_user_tenant_id so platform admins see their impersonated tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override uuid;
  v_real uuid;
BEGIN
  IF public.is_platform_admin(_user_id) THEN
    SELECT acting_tenant_id INTO v_override
    FROM public.platform_admin_sessions
    WHERE user_id = _user_id AND expires_at > now();
    IF v_override IS NOT NULL THEN
      RETURN v_override;
    END IF;
  END IF;
  SELECT tenant_id INTO v_real FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  RETURN v_real;
END;
$$;

-- Treat platform admins as admins (so existing is_admin() RLS clauses pass)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin', 'director', 'platform_admin')
  )
$$;