
ALTER TABLE public.profiles DISABLE TRIGGER check_status_update;
UPDATE public.profiles SET status = 'approved' WHERE user_id = '48f0fe48-9e51-418c-b2f8-adea8c15ba06';
ALTER TABLE public.profiles ENABLE TRIGGER check_status_update;

ALTER TABLE public.user_roles DISABLE TRIGGER check_role_escalation;
INSERT INTO public.user_roles (user_id, role) VALUES ('48f0fe48-9e51-418c-b2f8-adea8c15ba06', 'super_admin') ON CONFLICT (user_id, role) DO NOTHING;
ALTER TABLE public.user_roles ENABLE TRIGGER check_role_escalation;
