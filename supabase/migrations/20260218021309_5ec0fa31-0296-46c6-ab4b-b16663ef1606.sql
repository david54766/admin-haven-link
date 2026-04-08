
-- Temporarily disable the role escalation trigger so bootstrap can insert super_admin
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.user_roles;
