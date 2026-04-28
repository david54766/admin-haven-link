-- Tighten tenant isolation across all SELECT policies that were missing tenant_id filter

-- admin_announcements
DROP POLICY IF EXISTS "Approved users can view active announcements" ON public.admin_announcements;
CREATE POLICY "Approved users can view active announcements"
ON public.admin_announcements FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (center_id IS NULL OR center_id = (SELECT profiles.center_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1))
);

-- calendar_events
DROP POLICY IF EXISTS "Approved staff can view public events" ON public.calendar_events;
CREATE POLICY "Approved staff can view public events"
ON public.calendar_events FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
  AND admin_only = false
);

-- centers
DROP POLICY IF EXISTS "Approved users can view centers" ON public.centers;
DROP POLICY IF EXISTS "Public can view centers" ON public.centers;
CREATE POLICY "Approved users can view centers"
ON public.centers FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);
-- Public visibility kept off; signup form uses tenant-scoped lookups via positions/tenants RPCs

-- certificate_templates
DROP POLICY IF EXISTS "Approved users can view certificate templates" ON public.certificate_templates;
CREATE POLICY "Approved users can view certificate templates"
ON public.certificate_templates FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- checklist_items (tenant_id is on the row)
DROP POLICY IF EXISTS "Approved users can view checklist items" ON public.checklist_items;
CREATE POLICY "Approved users can view checklist items"
ON public.checklist_items FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- checklist_templates
DROP POLICY IF EXISTS "Approved users can view active checklist templates" ON public.checklist_templates;
CREATE POLICY "Approved users can view active checklist templates"
ON public.checklist_templates FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
  AND is_active = true
);

-- document_types
DROP POLICY IF EXISTS "Approved users can view doc types" ON public.document_types;
CREATE POLICY "Approved users can view doc types"
ON public.document_types FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- shared_resources
DROP POLICY IF EXISTS "Approved users can view shared resources" ON public.shared_resources;
CREATE POLICY "Approved users can view shared resources"
ON public.shared_resources FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- track_position_assignments (add tenant scoping; rows inherit via track_id, so check via training_tracks)
DROP POLICY IF EXISTS "Admins can manage track position assignments" ON public.track_position_assignments;
DROP POLICY IF EXISTS "Approved users can view track position assignments" ON public.track_position_assignments;

CREATE POLICY "Admins can manage track position assignments"
ON public.track_position_assignments FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.training_tracks t
    WHERE t.id = track_position_assignments.track_id
      AND t.tenant_id = get_user_tenant_id(auth.uid())
  )
)
WITH CHECK (
  is_admin(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.training_tracks t
    WHERE t.id = track_position_assignments.track_id
      AND t.tenant_id = get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Approved users can view track position assignments"
ON public.track_position_assignments FOR SELECT TO authenticated
USING (
  is_approved(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.training_tracks t
    WHERE t.id = track_position_assignments.track_id
      AND t.tenant_id = get_user_tenant_id(auth.uid())
  )
);