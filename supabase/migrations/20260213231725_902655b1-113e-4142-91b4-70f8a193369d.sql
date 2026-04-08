ALTER TABLE public.user_roles DISABLE TRIGGER check_role_escalation;

INSERT INTO public.user_roles (user_id, role) 
VALUES ('fe621595-fdf1-446e-951d-9c41ed29afe6', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.user_roles ENABLE TRIGGER check_role_escalation;