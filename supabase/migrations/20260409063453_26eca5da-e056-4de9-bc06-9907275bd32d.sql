
-- ============================================================
-- 1. QUIZ ANSWERS: Remove direct SELECT for non-admins
-- ============================================================
-- Drop the overly permissive policy that exposes correct_answer
DROP POLICY IF EXISTS "Approved users can view questions" ON public.quiz_questions;

-- Create a restricted policy: only admins can directly SELECT quiz_questions
-- Non-admin users must use get_quiz_questions_safe() RPC
CREATE POLICY "Admins can view all questions"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- 2. CERTIFICATES STORAGE: Drop broad authenticated policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete certificates" ON storage.objects;

-- ============================================================
-- 3. TENANTS: Hide contact_email and contact_name from public
-- ============================================================
DROP POLICY IF EXISTS "Public can resolve tenant by slug" ON public.tenants;
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;

-- Create a security definer function for public tenant resolution
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_slug(p_slug text)
RETURNS TABLE(id uuid, slug text, name text, branding jsonb, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.slug, t.name, t.branding, t.is_active
  FROM public.tenants t
  WHERE t.slug = p_slug AND t.is_active = true
  LIMIT 1;
$$;

-- Create a security definer function for listing active tenants (no sensitive fields)
CREATE OR REPLACE FUNCTION public.list_active_tenants()
RETURNS TABLE(id uuid, slug text, name text, branding jsonb, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.slug, t.name, t.branding, t.is_active
  FROM public.tenants t
  WHERE t.is_active = true;
$$;

-- ============================================================
-- 4. CROSS-TENANT ADMIN ACCESS: Add tenant_id filtering
-- ============================================================

-- 4a. video_progress
DROP POLICY IF EXISTS "Admins can view all video progress" ON public.video_progress;
CREATE POLICY "Admins can view all video progress"
  ON public.video_progress FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- 4b. videos
DROP POLICY IF EXISTS "Admins can manage videos" ON public.videos;
CREATE POLICY "Admins can manage videos"
  ON public.videos FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- 4c. track_certificates
DROP POLICY IF EXISTS "Admins can manage track certificates" ON public.track_certificates;
CREATE POLICY "Admins can manage track certificates"
  ON public.track_certificates FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all track certificates" ON public.track_certificates;
CREATE POLICY "Admins can view all track certificates"
  ON public.track_certificates FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- 4d. staff_training_goals
DROP POLICY IF EXISTS "Admins can manage training goals" ON public.staff_training_goals;
CREATE POLICY "Admins can manage training goals"
  ON public.staff_training_goals FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- 4e. user_roles (old broad policies)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- 4f. backups storage bucket
DROP POLICY IF EXISTS "Admins can manage backups" ON storage.objects;
CREATE POLICY "Admins can manage backups"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'backups' AND is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
  ))
  WITH CHECK (bucket_id = 'backups' AND is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
  ));
