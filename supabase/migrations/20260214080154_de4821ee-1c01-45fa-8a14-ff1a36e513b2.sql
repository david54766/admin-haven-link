
-- Drop the escalation trigger temporarily
DROP TRIGGER IF EXISTS check_role_escalation ON public.user_roles;

-- Insert super_admin role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('14c0910d-867e-46b2-8691-2a80896698e2', 'super_admin')
ON CONFLICT DO NOTHING;

-- Re-create the trigger
CREATE TRIGGER check_role_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
