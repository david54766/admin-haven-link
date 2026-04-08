
-- Disable the role escalation check trigger temporarily
DROP TRIGGER IF EXISTS check_role_escalation ON public.user_roles;
