-- Add 'disabled' to user_status enum
ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'disabled';

-- Update the is_approved function to exclude disabled users
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND status = 'approved'
  )
$$;