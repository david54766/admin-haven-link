DROP POLICY IF EXISTS "Approved users can view active tracks" ON public.training_tracks;
CREATE POLICY "Approved users can view active tracks"
ON public.training_tracks
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND is_active = true
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view active modules" ON public.modules;
CREATE POLICY "Approved users can view active modules"
ON public.modules
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND is_active = true
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view videos" ON public.videos;
CREATE POLICY "Approved users can view videos"
ON public.videos
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view quizzes" ON public.quizzes;
CREATE POLICY "Approved users can view quizzes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view homework" ON public.homework_assignments;
CREATE POLICY "Approved users can view homework"
ON public.homework_assignments
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view presentations" ON public.module_presentations;
CREATE POLICY "Approved users can view presentations"
ON public.module_presentations
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view documents" ON public.module_documents;
CREATE POLICY "Approved users can view documents"
ON public.module_documents
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view external trainings" ON public.module_external_trainings;
CREATE POLICY "Approved users can view external trainings"
ON public.module_external_trainings
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view lessons" ON public.module_lessons;
CREATE POLICY "Approved users can view lessons"
ON public.module_lessons
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can view lesson pages" ON public.lesson_pages;
CREATE POLICY "Approved users can view lesson pages"
ON public.lesson_pages
FOR SELECT
TO authenticated
USING (
  public.is_approved(auth.uid())
  AND tenant_id = public.get_user_tenant_id(auth.uid())
);