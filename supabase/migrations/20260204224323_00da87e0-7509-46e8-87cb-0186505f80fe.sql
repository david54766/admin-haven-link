-- Add file_required column to homework_assignments table
-- Defaults to true for backward compatibility with existing homework
ALTER TABLE public.homework_assignments
ADD COLUMN file_required boolean NOT NULL DEFAULT true;