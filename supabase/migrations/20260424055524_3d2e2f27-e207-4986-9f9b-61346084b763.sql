-- When an admin approves a profile, move that profile into the approving admin's tenant
-- This handles users who signed up via the generic /apply route and landed in the platform tenant

CREATE OR REPLACE FUNCTION public.move_approved_user_to_admin_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_tenant uuid;
  v_acting_user uuid;
BEGIN
  -- Only act when status is being changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    v_acting_user := auth.uid();

    -- Skip if no acting user (e.g. system/service role calls)
    IF v_acting_user IS NULL THEN
      RETURN NEW;
    END IF;

    -- Skip platform admins (they can approve across tenants without reassigning)
    IF public.is_platform_admin(v_acting_user) THEN
      RETURN NEW;
    END IF;

    v_admin_tenant := public.get_user_tenant_id(v_acting_user);

    -- If admin belongs to a real tenant and the approved user is in a different tenant,
    -- move the user into the admin's tenant
    IF v_admin_tenant IS NOT NULL AND NEW.tenant_id IS DISTINCT FROM v_admin_tenant THEN
      NEW.tenant_id := v_admin_tenant;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS move_approved_user_to_admin_tenant_trigger ON public.profiles;

CREATE TRIGGER move_approved_user_to_admin_tenant_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.move_approved_user_to_admin_tenant();