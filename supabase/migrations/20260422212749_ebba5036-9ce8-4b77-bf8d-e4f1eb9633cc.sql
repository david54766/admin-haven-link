-- Auto-fill tenant_id on insert for training_tracks so admins inserting from the client
-- don't need to manually pass tenant_id (which would otherwise default to the platform tenant
-- and violate the RLS check tenant_id = get_user_tenant_id(auth.uid())).

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_tenant uuid;
BEGIN
  v_user_tenant := public.get_user_tenant_id(auth.uid());

  -- If no row provided tenant_id, OR it was left at the default platform tenant
  -- while the acting user belongs to a different tenant, override it.
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := COALESCE(v_user_tenant, NEW.tenant_id);
  ELSIF v_user_tenant IS NOT NULL
        AND NEW.tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND v_user_tenant <> '00000000-0000-0000-0000-000000000001'::uuid THEN
    NEW.tenant_id := v_user_tenant;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tenant_id_on_training_tracks ON public.training_tracks;
CREATE TRIGGER set_tenant_id_on_training_tracks
  BEFORE INSERT ON public.training_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_user();