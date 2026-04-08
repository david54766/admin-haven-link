-- Migrate any existing admin users to director role
UPDATE public.user_roles 
SET role = 'director'::app_role 
WHERE role = 'admin'::app_role;