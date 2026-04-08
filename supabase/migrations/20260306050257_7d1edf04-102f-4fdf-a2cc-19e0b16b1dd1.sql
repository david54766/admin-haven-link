
-- Feature 3: Add 'inactive' to user_status enum (replaces 'disabled')
ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'inactive';

-- Feature 5: Add center_id to admin_announcements for center-specific announcements
ALTER TABLE public.admin_announcements ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id) ON DELETE SET NULL;

-- Feature 5: Add checklist_email_notifications to profiles (Feature 2 prep)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS checklist_email_notifications boolean NOT NULL DEFAULT true;
