-- Auto-stamp tenant on insert
DROP TRIGGER IF EXISTS set_tenant_id_on_system_settings ON public.system_settings;
CREATE TRIGGER set_tenant_id_on_system_settings
  BEFORE INSERT ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Allow same key per tenant (drop global unique if it exists, add composite)
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
DROP INDEX IF EXISTS public.system_settings_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS system_settings_tenant_key_key
  ON public.system_settings (tenant_id, key);

-- Tighten RLS to be tenant-scoped
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Approved users can view system settings" ON public.system_settings;
CREATE POLICY "Approved users can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (is_approved(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));