-- Read-only regression checks for David's confirmed Miracle Grow training rules.
-- Execute through the database read tool; every result must be true.
SELECT 'Mandated Reporter awards 0.5 hours, including issued certificates' AS rule,
  EXISTS (SELECT 1 FROM public.modules WHERE tenant_id='f4e0c94e-56f5-41d0-9bc3-f403524474a5' AND id='e0c67ec9-f234-4b55-9f3a-cdda57c196e9' AND course_hours=0.5 AND certificate_enabled)
  AND EXISTS (SELECT 1 FROM public.module_certificates WHERE tenant_id='f4e0c94e-56f5-41d0-9bc3-f403524474a5' AND module_id='e0c67ec9-f234-4b55-9f3a-cdda57c196e9')
  AND NOT EXISTS (SELECT 1 FROM public.module_certificates WHERE tenant_id='f4e0c94e-56f5-41d0-9bc3-f403524474a5' AND module_id='e0c67ec9-f234-4b55-9f3a-cdda57c196e9' AND hours_earned IS DISTINCT FROM 0.5) AS passed
UNION ALL
SELECT 'Program Plan & Curriculum awards 0.5 hours, including issued certificates',
  EXISTS (SELECT 1 FROM public.modules WHERE tenant_id='f4e0c94e-56f5-41d0-9bc3-f403524474a5' AND id='4f486b46-8f29-46ab-bec9-696768188ef1' AND course_hours=0.5 AND certificate_enabled)
  AND EXISTS (SELECT 1 FROM public.module_certificates WHERE tenant_id='f4e0c94e-56f5-41d0-9bc3-f403524474a5' AND module_id='4f486b46-8f29-46ab-bec9-696768188ef1')
  AND NOT EXISTS (SELECT 1 FROM public.module_certificates WHERE tenant_id='f4e0c94e-56f5-41d0-9bc3-f403524474a5' AND module_id='4f486b46-8f29-46ab-bec9-696768188ef1' AND hours_earned IS DISTINCT FROM 0.5)
UNION ALL
SELECT 'Overall Center-Wide Onboarding certificate issuance disabled',
  EXISTS (SELECT 1 FROM public.training_tracks WHERE tenant_id='f4e0c94e-56f5-41d0-9bc3-f403524474a5' AND id='80dc4227-f7c0-4ad2-8977-f2cc7d907836' AND certificate_enabled=false);