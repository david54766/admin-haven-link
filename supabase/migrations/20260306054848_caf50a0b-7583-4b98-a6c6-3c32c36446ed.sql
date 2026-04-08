
-- Certificate templates table
CREATE TABLE public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Default Template',
  background_image_url text,
  text_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  expiry_months integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage certificate templates"
  ON public.certificate_templates FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Approved users can view certificate templates"
  ON public.certificate_templates FOR SELECT
  TO authenticated
  USING (is_approved(auth.uid()));

-- Add certificate_template_id to training_tracks
ALTER TABLE public.training_tracks
  ADD COLUMN certificate_template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL;

-- Add certificate_template_id to modules  
ALTER TABLE public.modules
  ADD COLUMN certificate_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN certificate_template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  ADD COLUMN instructor_name text;

-- Add expiry_date to track_certificates
ALTER TABLE public.track_certificates
  ADD COLUMN expiry_date date;

-- Module certificates table (mirrors track_certificates)
CREATE TABLE public.module_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.training_tracks(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  center_name text NOT NULL,
  instructor_name text NOT NULL,
  module_title text NOT NULL,
  track_title text NOT NULL,
  hours_earned numeric NOT NULL DEFAULT 0,
  expiry_date date,
  certificate_number text NOT NULL DEFAULT ('MC-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.module_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage module certificates"
  ON public.module_certificates FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view own module certificates"
  ON public.module_certificates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own module certificates"
  ON public.module_certificates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Backups storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false);

CREATE POLICY "Admins can manage backups"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'backups' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'backups' AND is_admin(auth.uid()));

-- Updated_at trigger for certificate_templates
CREATE TRIGGER update_certificate_templates_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
