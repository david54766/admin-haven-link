-- Add auto_assign column to training_tracks
ALTER TABLE public.training_tracks
ADD COLUMN auto_assign boolean NOT NULL DEFAULT false;

-- Create function to auto-assign tracks when user is approved
CREATE OR REPLACE FUNCTION public.auto_assign_tracks_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    -- Insert track assignments for all tracks marked as auto_assign
    INSERT INTO public.staff_track_assignments (user_id, track_id)
    SELECT NEW.user_id, t.id
    FROM public.training_tracks t
    WHERE t.auto_assign = true AND t.is_active = true
    ON CONFLICT (user_id, track_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER trigger_auto_assign_tracks
AFTER INSERT OR UPDATE OF status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_tracks_on_approval();

-- Add unique constraint to staff_track_assignments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'staff_track_assignments_user_track_unique'
  ) THEN
    ALTER TABLE public.staff_track_assignments
    ADD CONSTRAINT staff_track_assignments_user_track_unique UNIQUE (user_id, track_id);
  END IF;
END $$;