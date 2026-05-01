
-- 1) Tighten policies: drop overly-permissive public/anon SELECTs
DROP POLICY IF EXISTS "Public can view enabled application fields" ON public.application_form_fields;
DROP POLICY IF EXISTS "Anon can view centers" ON public.centers;

-- 2) Provide safe tenant-scoped RPCs for the public apply/register pages

CREATE OR REPLACE FUNCTION public.list_application_fields_for_tenant(p_tenant_id uuid)
RETURNS SETOF public.application_form_fields
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.*
  FROM public.application_form_fields f
  JOIN public.tenants t ON t.id = f.tenant_id AND t.is_active = true
  WHERE f.tenant_id = p_tenant_id
    AND f.is_enabled = true
  ORDER BY f.order_index;
$$;

CREATE OR REPLACE FUNCTION public.list_centers_for_tenant(p_tenant_id uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name
  FROM public.centers c
  JOIN public.tenants t ON t.id = c.tenant_id AND t.is_active = true
  WHERE c.tenant_id = p_tenant_id
  ORDER BY c.name;
$$;

CREATE OR REPLACE FUNCTION public.list_positions_for_tenant(p_tenant_id uuid)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name
  FROM public.positions p
  JOIN public.tenants t ON t.id = p.tenant_id AND t.is_active = true
  WHERE p.tenant_id = p_tenant_id
    AND p.is_active = true
  ORDER BY p.order_index;
$$;

GRANT EXECUTE ON FUNCTION public.list_application_fields_for_tenant(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_centers_for_tenant(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_positions_for_tenant(uuid) TO anon, authenticated;
