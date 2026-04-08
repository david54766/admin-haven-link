
-- Create tenants table
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  domain text UNIQUE,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tenant
INSERT INTO public.tenants (id, name, slug, branding)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', '{}');

-- Add tenant_id to all tables
ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.user_roles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.centers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.training_tracks ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.modules ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.videos ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.quizzes ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.quiz_questions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.homework_assignments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.module_documents ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.module_presentations ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.module_external_trainings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.module_lessons ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.lesson_pages ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.system_settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.certificate_templates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.positions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.application_form_fields ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.application_notification_recipients ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.document_types ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.admin_announcements ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.calendar_events ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.shared_resources ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.checklist_templates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.checklist_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.expenses ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.staff_documents ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.staff_certificates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.staff_hours_log ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.staff_training_goals ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.staff_track_assignments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.video_progress ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.quiz_attempts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.presentation_progress ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.document_progress ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.lesson_progress ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.self_reflections ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.reflection_responses ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.homework_submissions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.external_training_submissions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.important_document_submissions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.checklist_submissions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.checklist_submission_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.track_certificates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.module_certificates ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.track_position_assignments ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

-- Migrate all existing data to default tenant
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.user_roles SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.centers SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.training_tracks SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.modules SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.videos SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.quizzes SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.quiz_questions SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.homework_assignments SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.module_documents SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.module_presentations SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.module_external_trainings SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.module_lessons SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.lesson_pages SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.system_settings SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.certificate_templates SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.positions SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.application_form_fields SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.application_notification_recipients SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.document_types SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.admin_announcements SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.calendar_events SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.shared_resources SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.checklist_templates SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.checklist_items SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.expenses SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.staff_documents SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.staff_certificates SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.staff_hours_log SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.staff_training_goals SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.staff_track_assignments SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.video_progress SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.quiz_attempts SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.presentation_progress SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.document_progress SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.lesson_progress SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.self_reflections SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.reflection_responses SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.homework_submissions SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.external_training_submissions SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.important_document_submissions SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.checklist_submissions SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.checklist_submission_items SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.track_certificates SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.module_certificates SET tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.track_position_assignments SET tenant_id = '00000000-0000-0000-0000-000000000001';

-- Make tenant_id NOT NULL
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.centers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.training_tracks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.modules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.videos ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.quizzes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.quiz_questions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.homework_assignments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.module_documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.module_presentations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.module_external_trainings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.module_lessons ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.lesson_pages ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.system_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.certificate_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.positions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.application_form_fields ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.application_notification_recipients ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.document_types ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.admin_announcements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.calendar_events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shared_resources ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.checklist_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.checklist_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.staff_documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.staff_certificates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.staff_hours_log ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.staff_training_goals ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.staff_track_assignments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.video_progress ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.quiz_attempts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.presentation_progress ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.document_progress ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.lesson_progress ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.self_reflections ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.reflection_responses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.homework_submissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.external_training_submissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.important_document_submissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.checklist_submissions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.checklist_submission_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.track_certificates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.module_certificates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.track_position_assignments ALTER COLUMN tenant_id SET NOT NULL;

-- Create indexes
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX idx_centers_tenant ON public.centers(tenant_id);
CREATE INDEX idx_training_tracks_tenant ON public.training_tracks(tenant_id);
CREATE INDEX idx_modules_tenant ON public.modules(tenant_id);
CREATE INDEX idx_videos_tenant ON public.videos(tenant_id);
CREATE INDEX idx_system_settings_tenant ON public.system_settings(tenant_id);
CREATE INDEX idx_admin_announcements_tenant ON public.admin_announcements(tenant_id);
CREATE INDEX idx_calendar_events_tenant ON public.calendar_events(tenant_id);
CREATE INDEX idx_shared_resources_tenant ON public.shared_resources(tenant_id);
CREATE INDEX idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX idx_staff_documents_tenant ON public.staff_documents(tenant_id);
CREATE INDEX idx_staff_certificates_tenant ON public.staff_certificates(tenant_id);
CREATE INDEX idx_video_progress_tenant ON public.video_progress(tenant_id);
CREATE INDEX idx_quiz_attempts_tenant ON public.quiz_attempts(tenant_id);
CREATE INDEX idx_self_reflections_tenant ON public.self_reflections(tenant_id);

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_tenant_id(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.user_in_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  )
$$;

-- Update handle_new_user to set tenant_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, phone, application_message, status, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'application_message',
    'pending',
    COALESCE((NEW.raw_user_meta_data->>'tenant_id')::uuid, '00000000-0000-0000-0000-000000000001'::uuid)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    application_message = COALESCE(EXCLUDED.application_message, profiles.application_message);
  
  RETURN NEW;
END;
$$;

-- Update auto_assign_tracks to scope by tenant
CREATE OR REPLACE FUNCTION public.auto_assign_tracks_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    INSERT INTO public.staff_track_assignments (user_id, track_id, tenant_id)
    SELECT NEW.user_id, t.id, NEW.tenant_id
    FROM public.training_tracks t
    WHERE t.auto_assign = true AND t.is_active = true AND t.tenant_id = NEW.tenant_id
    ON CONFLICT (user_id, track_id) DO NOTHING;

    INSERT INTO public.staff_track_assignments (user_id, track_id, tenant_id)
    SELECT NEW.user_id, tpa.track_id, NEW.tenant_id
    FROM public.track_position_assignments tpa
    JOIN public.positions p ON p.id = tpa.position_id
    JOIN public.training_tracks t ON t.id = tpa.track_id
    WHERE p.name = NEW.position AND t.is_active = true AND t.tenant_id = NEW.tenant_id
    ON CONFLICT (user_id, track_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Tenants table policies (now profiles.tenant_id exists)
CREATE POLICY "Public can view active tenants"
  ON public.tenants FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can update own tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) AND id = get_current_tenant_id())
  WITH CHECK (is_admin(auth.uid()) AND id = get_current_tenant_id());
