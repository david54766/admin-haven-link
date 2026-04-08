-- Add allow_mark_complete column to videos table
ALTER TABLE public.videos
ADD COLUMN allow_mark_complete boolean NOT NULL DEFAULT true;