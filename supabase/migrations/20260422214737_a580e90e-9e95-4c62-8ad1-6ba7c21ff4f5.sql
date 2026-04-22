DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'admin_announcements',
    'application_form_fields',
    'application_notification_recipients',
    'calendar_events',
    'centers',
    'checklist_items',
    'checklist_templates',
    'document_types',
    'expenses',
    'module_certificates',
    'positions',
    'shared_resources',
    'staff_certificates',
    'staff_training_goals',
    'track_certificates'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_on_%I ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER set_tenant_id_on_%I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();',
      t, t
    );
  END LOOP;
END $$;