-- Add platform_admin to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';

-- Extend tenants table with contact and management fields
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 50;