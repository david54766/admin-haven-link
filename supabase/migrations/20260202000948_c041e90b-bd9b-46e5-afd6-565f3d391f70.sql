-- Add position column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN position text;