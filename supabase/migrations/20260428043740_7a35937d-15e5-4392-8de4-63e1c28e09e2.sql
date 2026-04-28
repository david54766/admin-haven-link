DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE confrelid = 'public.tenants'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) NOT ILIKE '%ON DELETE CASCADE%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    -- Recreate with CASCADE; assume column is tenant_id, except platform_admin_sessions which is acting_tenant_id
    IF r.conname = 'platform_admin_sessions_acting_tenant_id_fkey' THEN
      EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (acting_tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE', r.tbl, r.conname);
    ELSE
      EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE', r.tbl, r.conname);
    END IF;
  END LOOP;
END $$;