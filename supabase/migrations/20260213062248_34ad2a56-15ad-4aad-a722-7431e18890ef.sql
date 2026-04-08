-- Drop the existing role escalation trigger
DROP TRIGGER IF EXISTS check_role_escalation ON public.user_roles;

-- Insert admin role
INSERT INTO public.user_roles (user_id, role) 
VALUES ('74c81d1a-36f5-4f6b-85cd-365c72cc6c2d', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Recreate the trigger
CREATE TRIGGER check_role_escalation
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();