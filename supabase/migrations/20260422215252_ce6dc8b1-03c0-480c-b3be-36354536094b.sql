ALTER TABLE public.positions DROP CONSTRAINT IF EXISTS positions_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS positions_tenant_name_key ON public.positions (tenant_id, name);