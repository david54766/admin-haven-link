DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'videos',
    'quizzes',
    'quiz_questions',
    'homework_assignments',
    'module_presentations',
    'module_documents',
    'module_external_trainings',
    'module_lessons',
    'lesson_pages',
    'certificate_templates'
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