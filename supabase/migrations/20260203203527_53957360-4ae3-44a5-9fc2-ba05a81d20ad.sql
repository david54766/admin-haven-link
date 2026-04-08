-- Add 'director' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'director' AFTER 'staff';