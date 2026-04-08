
-- Temporarily disable role escalation trigger for seeding
DROP TRIGGER IF EXISTS check_role_escalation ON public.user_roles;
