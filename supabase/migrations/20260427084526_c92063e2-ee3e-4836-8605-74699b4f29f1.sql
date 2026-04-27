-- Move Nnenna Nwidi from the Platform tenant into COD Kids
UPDATE public.profiles
SET tenant_id = 'b22e8861-7d6d-4bf6-916c-58551884383a'
WHERE email = 'nnenwidi@gmail.com'
  AND tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE public.user_roles
SET tenant_id = 'b22e8861-7d6d-4bf6-916c-58551884383a'
WHERE user_id = (SELECT user_id FROM public.profiles WHERE email = 'nnenwidi@gmail.com')
  AND tenant_id = '00000000-0000-0000-0000-000000000001';