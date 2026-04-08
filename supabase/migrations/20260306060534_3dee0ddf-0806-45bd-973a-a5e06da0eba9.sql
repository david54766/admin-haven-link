
ALTER TABLE public.training_tracks 
  ADD COLUMN IF NOT EXISTS certificate_title text,
  ADD COLUMN IF NOT EXISTS course_hours numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS certificate_expiry_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS certificate_mode text NOT NULL DEFAULT 'per_track';

ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS course_hours numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS certificate_expiry_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS certificate_title text;
