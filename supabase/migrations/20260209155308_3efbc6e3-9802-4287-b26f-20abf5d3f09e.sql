
-- Add certificate settings to training_tracks
ALTER TABLE public.training_tracks 
  ADD COLUMN certificate_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN instructor_name text NULL;

-- Create table for issued track completion certificates
CREATE TABLE public.track_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.training_tracks(id) ON DELETE CASCADE,
  staff_name text NOT NULL,
  center_name text NOT NULL,
  instructor_name text NOT NULL,
  track_title text NOT NULL,
  hours_earned numeric NOT NULL DEFAULT 0,
  issued_at timestamp with time zone NOT NULL DEFAULT now(),
  certificate_number text NOT NULL DEFAULT ('TC-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.track_certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view own track certificates"
  ON public.track_certificates FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all certificates
CREATE POLICY "Admins can view all track certificates"
  ON public.track_certificates FOR SELECT
  USING (is_admin(auth.uid()));

-- Admins can insert certificates (issued by system)
CREATE POLICY "Admins can manage track certificates"
  ON public.track_certificates FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Users can insert their own certificates (issued on completion)
CREATE POLICY "Users can insert own track certificates"
  ON public.track_certificates FOR INSERT
  WITH CHECK (user_id = auth.uid());
