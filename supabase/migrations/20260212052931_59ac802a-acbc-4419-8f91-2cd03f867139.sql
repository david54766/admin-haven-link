
-- Create positions table (admin-managed)
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage positions" ON public.positions FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view active positions" ON public.positions FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default positions
INSERT INTO public.positions (name, order_index) VALUES
  ('Lead Teacher', 0),
  ('Assistant Teacher', 1),
  ('Teacher Aide', 2),
  ('Floater', 3),
  ('Kitchen Staff', 4),
  ('Administrator', 5),
  ('Assistant Director', 6),
  ('Director', 7),
  ('Support', 8),
  ('Other', 9);

-- Create track-to-position mapping table
CREATE TABLE public.track_position_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.training_tracks(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_id, position_id)
);

ALTER TABLE public.track_position_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage track position assignments" ON public.track_position_assignments FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Approved users can view track position assignments" ON public.track_position_assignments FOR SELECT
  USING (is_approved(auth.uid()));

-- Update the auto_assign trigger to be position-aware
CREATE OR REPLACE FUNCTION public.auto_assign_tracks_on_approval()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    -- Assign tracks that are globally auto_assign
    INSERT INTO public.staff_track_assignments (user_id, track_id)
    SELECT NEW.user_id, t.id
    FROM public.training_tracks t
    WHERE t.auto_assign = true AND t.is_active = true
    ON CONFLICT (user_id, track_id) DO NOTHING;

    -- Assign tracks mapped to the user's position
    INSERT INTO public.staff_track_assignments (user_id, track_id)
    SELECT NEW.user_id, tpa.track_id
    FROM public.track_position_assignments tpa
    JOIN public.positions p ON p.id = tpa.position_id
    JOIN public.training_tracks t ON t.id = tpa.track_id
    WHERE p.name = NEW.position AND t.is_active = true
    ON CONFLICT (user_id, track_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
