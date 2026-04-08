-- Create system settings table for global defaults
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system settings
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Approved users can view settings
CREATE POLICY "Approved users can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (is_approved(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content settings
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'content_defaults',
  '{"allow_mark_complete": false, "allow_download": false}'::jsonb,
  'Default settings for new content items (videos, presentations, documents)'
);

-- Add track-level default overrides to training_tracks
ALTER TABLE public.training_tracks
ADD COLUMN default_allow_mark_complete boolean DEFAULT NULL,
ADD COLUMN default_allow_download boolean DEFAULT NULL;

-- NULL means inherit from system settings, true/false overrides