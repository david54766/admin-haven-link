DROP TRIGGER IF EXISTS set_tenant_id_on_modules ON public.modules;

CREATE TRIGGER set_tenant_id_on_modules
BEFORE INSERT ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_id_from_user();