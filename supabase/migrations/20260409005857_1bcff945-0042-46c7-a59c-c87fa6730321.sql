INSERT INTO public.user_roles (user_id, role)
VALUES ('cb57d4b9-59d3-4b01-b8bc-a692c56811e8', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;