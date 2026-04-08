-- Add mood, tags, and privacy columns to self_reflections
ALTER TABLE public.self_reflections
ADD COLUMN mood text,
ADD COLUMN tags text[] DEFAULT '{}',
ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Add comment explaining privacy: false = shared with admin (default), true = personal only
COMMENT ON COLUMN public.self_reflections.is_private IS 'false = shared with admin (default), true = personal/private';
