CREATE OR REPLACE FUNCTION public.set_training_progress_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  profile_tenant uuid;
  content_tenant uuid;
  content_id uuid;
BEGIN
  SELECT tenant_id INTO profile_tenant FROM public.profiles WHERE user_id = NEW.user_id;
  content_id := (to_jsonb(NEW) ->> TG_ARGV[1])::uuid;
  IF content_id IS NOT NULL THEN
    EXECUTE format('SELECT t.tenant_id FROM public.%I c JOIN public.modules m ON m.id = c.module_id JOIN public.training_tracks t ON t.id = m.track_id WHERE c.id = $1', TG_ARGV[0]) INTO content_tenant USING content_id;
    IF profile_tenant IS NULL OR content_tenant IS DISTINCT FROM profile_tenant THEN
      RAISE EXCEPTION 'Training content must belong to the staff organization';
    END IF;
  ELSE
    IF TG_TABLE_NAME <> 'external_training_submissions' OR profile_tenant IS NULL THEN
      RAISE EXCEPTION 'Training content and staff organization are required';
    END IF;
    content_tenant := profile_tenant;
  END IF;
  NEW.tenant_id := content_tenant;
  RETURN NEW;
END;
$$;
CREATE TRIGGER stamp_video_progress_tenant BEFORE INSERT OR UPDATE ON public.video_progress FOR EACH ROW EXECUTE FUNCTION public.set_training_progress_tenant('videos', 'video_id');
CREATE TRIGGER stamp_quiz_attempts_tenant BEFORE INSERT OR UPDATE ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.set_training_progress_tenant('quizzes', 'quiz_id');
CREATE TRIGGER stamp_presentation_progress_tenant BEFORE INSERT OR UPDATE ON public.presentation_progress FOR EACH ROW EXECUTE FUNCTION public.set_training_progress_tenant('module_presentations', 'presentation_id');
CREATE TRIGGER stamp_document_progress_tenant BEFORE INSERT OR UPDATE ON public.document_progress FOR EACH ROW EXECUTE FUNCTION public.set_training_progress_tenant('module_documents', 'document_id');
CREATE TRIGGER stamp_lesson_progress_tenant BEFORE INSERT OR UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.set_training_progress_tenant('module_lessons', 'lesson_id');
CREATE TRIGGER stamp_homework_submissions_tenant BEFORE INSERT OR UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION public.set_training_progress_tenant('homework_assignments', 'homework_id');
CREATE TRIGGER stamp_external_training_submissions_tenant BEFORE INSERT OR UPDATE ON public.external_training_submissions FOR EACH ROW EXECUTE FUNCTION public.set_training_progress_tenant('module_external_trainings', 'external_training_id');