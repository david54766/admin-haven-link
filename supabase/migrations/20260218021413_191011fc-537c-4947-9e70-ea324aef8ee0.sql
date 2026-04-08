
-- Re-enable the role escalation trigger
CREATE TRIGGER check_role_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
