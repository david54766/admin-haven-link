
-- Helper: tenant-scoped admin check
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role::text IN ('admin', 'super_admin', 'director')
      AND p.tenant_id = _tenant_id
  )
$$;

-- =============================================
-- PROFILES: Scope admin access to same tenant
-- =============================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- =============================================
-- USER_ROLES: Scope to same tenant
-- =============================================
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view tenant user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR (is_admin(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.tenant_id = get_user_tenant_id(auth.uid())
    ))
  );

CREATE POLICY "Admins can manage tenant user roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    is_platform_admin(auth.uid())
    OR (is_admin(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.tenant_id = get_user_tenant_id(auth.uid())
    ))
  )
  WITH CHECK (
    is_platform_admin(auth.uid())
    OR (is_admin(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND p.tenant_id = get_user_tenant_id(auth.uid())
    ))
  );

-- =============================================
-- CENTERS: Scope admin access
-- =============================================
DROP POLICY IF EXISTS "Admins can manage centers" ON public.centers;
CREATE POLICY "Admins can manage centers"
  ON public.centers FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- =============================================
-- TENANTS: Only platform admins see all; tenant admins see own
-- =============================================
DROP POLICY IF EXISTS "Platform admins can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Platform admins can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenant admins can view own tenant" ON public.tenants;

CREATE POLICY "Platform admins can manage tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant admins can view own tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (id = get_user_tenant_id(auth.uid()));

-- Allow public to resolve tenant by slug (for login/landing)
CREATE POLICY "Public can resolve tenant by slug"
  ON public.tenants FOR SELECT
  USING (is_active = true);

-- =============================================
-- Scope all other admin-managed tables
-- =============================================

-- training_tracks
DROP POLICY IF EXISTS "Admins can manage tracks" ON public.training_tracks;
CREATE POLICY "Admins can manage tracks"
  ON public.training_tracks FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- modules
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
DROP POLICY IF EXISTS "Admins can view all modules" ON public.modules;
CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- admin_announcements
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.admin_announcements;
CREATE POLICY "Admins can manage announcements"
  ON public.admin_announcements FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- shared_resources
DROP POLICY IF EXISTS "Admins can manage shared resources" ON public.shared_resources;
CREATE POLICY "Admins can manage shared resources"
  ON public.shared_resources FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- expenses
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
CREATE POLICY "Admins can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- calendar_events
DROP POLICY IF EXISTS "Admins can manage calendar events" ON public.calendar_events;
CREATE POLICY "Admins can manage calendar events"
  ON public.calendar_events FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- certificate_templates
DROP POLICY IF EXISTS "Admins can manage certificate templates" ON public.certificate_templates;
CREATE POLICY "Admins can manage certificate templates"
  ON public.certificate_templates FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- checklist_templates
DROP POLICY IF EXISTS "Admins can manage checklist templates" ON public.checklist_templates;
CREATE POLICY "Admins can manage checklist templates"
  ON public.checklist_templates FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- checklist_items
DROP POLICY IF EXISTS "Admins can manage checklist items" ON public.checklist_items;
CREATE POLICY "Admins can manage checklist items"
  ON public.checklist_items FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- positions
DROP POLICY IF EXISTS "Admins can manage positions" ON public.positions;
CREATE POLICY "Admins can manage positions"
  ON public.positions FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- module_certificates
DROP POLICY IF EXISTS "Admins can manage module certificates" ON public.module_certificates;
CREATE POLICY "Admins can manage module certificates"
  ON public.module_certificates FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- homework_assignments
DROP POLICY IF EXISTS "Admins can manage homework" ON public.homework_assignments;
CREATE POLICY "Admins can manage homework"
  ON public.homework_assignments FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- homework_submissions admin policies
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.homework_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.homework_submissions;
CREATE POLICY "Admins can view all submissions"
  ON public.homework_submissions FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can update submissions"
  ON public.homework_submissions FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- quizzes
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;
CREATE POLICY "Admins can manage quizzes"
  ON public.quizzes FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- quiz_questions
DROP POLICY IF EXISTS "Admins can manage questions" ON public.quiz_questions;
CREATE POLICY "Admins can manage questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- quiz_attempts admin
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Admins can view all quiz attempts"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- self_reflections admin
DROP POLICY IF EXISTS "Admins can view all reflections" ON public.self_reflections;
CREATE POLICY "Admins can view all reflections"
  ON public.self_reflections FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- reflection_responses admin
DROP POLICY IF EXISTS "Admins can view all responses" ON public.reflection_responses;
CREATE POLICY "Admins can view all responses"
  ON public.reflection_responses FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- staff_track_assignments
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.staff_track_assignments;
DROP POLICY IF EXISTS "Admins can view all assignments" ON public.staff_track_assignments;
CREATE POLICY "Admins can manage assignments"
  ON public.staff_track_assignments FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- staff_certificates admin
DROP POLICY IF EXISTS "Admins can view all certificates" ON public.staff_certificates;
DROP POLICY IF EXISTS "Admins can insert staff certificates" ON public.staff_certificates;
DROP POLICY IF EXISTS "Admins can update staff certificates" ON public.staff_certificates;
CREATE POLICY "Admins can view all certificates"
  ON public.staff_certificates FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can insert staff certificates"
  ON public.staff_certificates FOR INSERT
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can update staff certificates"
  ON public.staff_certificates FOR UPDATE
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- staff_documents admin
DROP POLICY IF EXISTS "Admins can view all documents" ON public.staff_documents;
CREATE POLICY "Admins can view all documents"
  ON public.staff_documents FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- staff_hours_log admin
DROP POLICY IF EXISTS "Admins can view all hours" ON public.staff_hours_log;
CREATE POLICY "Admins can view all hours"
  ON public.staff_hours_log FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- external_training_submissions admin
DROP POLICY IF EXISTS "Admins can view all external training submissions" ON public.external_training_submissions;
DROP POLICY IF EXISTS "Admins can update external training submissions" ON public.external_training_submissions;
CREATE POLICY "Admins can view all external training submissions"
  ON public.external_training_submissions FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can update external training submissions"
  ON public.external_training_submissions FOR UPDATE
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- important_document_submissions admin
DROP POLICY IF EXISTS "Admins can view all important doc submissions" ON public.important_document_submissions;
DROP POLICY IF EXISTS "Admins can update important doc submissions" ON public.important_document_submissions;
CREATE POLICY "Admins can view all important doc submissions"
  ON public.important_document_submissions FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins can update important doc submissions"
  ON public.important_document_submissions FOR UPDATE
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- document_progress admin
DROP POLICY IF EXISTS "Admins can view all document progress" ON public.document_progress;
CREATE POLICY "Admins can view all document progress"
  ON public.document_progress FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- lesson_progress admin
DROP POLICY IF EXISTS "Admins can view all lesson progress" ON public.lesson_progress;
CREATE POLICY "Admins can view all lesson progress"
  ON public.lesson_progress FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- presentation_progress admin
DROP POLICY IF EXISTS "Admins can view all presentation progress" ON public.presentation_progress;
CREATE POLICY "Admins can view all presentation progress"
  ON public.presentation_progress FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- checklist_submissions admin
DROP POLICY IF EXISTS "Admins can view all checklist submissions" ON public.checklist_submissions;
CREATE POLICY "Admins can view all checklist submissions"
  ON public.checklist_submissions FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- checklist_submission_items admin
DROP POLICY IF EXISTS "Admins can view all submission items" ON public.checklist_submission_items;
CREATE POLICY "Admins can view all submission items"
  ON public.checklist_submission_items FOR SELECT
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- module_documents admin
DROP POLICY IF EXISTS "Admins can manage documents" ON public.module_documents;
CREATE POLICY "Admins can manage documents"
  ON public.module_documents FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- module_lessons admin
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.module_lessons;
CREATE POLICY "Admins can manage lessons"
  ON public.module_lessons FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- lesson_pages admin
DROP POLICY IF EXISTS "Admins can manage lesson pages" ON public.lesson_pages;
CREATE POLICY "Admins can manage lesson pages"
  ON public.lesson_pages FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- module_presentations admin
DROP POLICY IF EXISTS "Admins can manage presentations" ON public.module_presentations;
CREATE POLICY "Admins can manage presentations"
  ON public.module_presentations FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- module_external_trainings admin
DROP POLICY IF EXISTS "Admins can manage external trainings" ON public.module_external_trainings;
CREATE POLICY "Admins can manage external trainings"
  ON public.module_external_trainings FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- application_form_fields admin
DROP POLICY IF EXISTS "Admins can manage application fields" ON public.application_form_fields;
CREATE POLICY "Admins can manage application fields"
  ON public.application_form_fields FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- application_notification_recipients admin
DROP POLICY IF EXISTS "Admins can manage notification recipients" ON public.application_notification_recipients;
CREATE POLICY "Admins can manage notification recipients"
  ON public.application_notification_recipients FOR ALL
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- document_types admin
DROP POLICY IF EXISTS "Admins can manage doc types" ON public.document_types;
CREATE POLICY "Admins can manage doc types"
  ON public.document_types FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));
