
-- Update RLS policy for announcements to filter by center_id
DROP POLICY IF EXISTS "Approved users can view active announcements" ON public.admin_announcements;

CREATE POLICY "Approved users can view active announcements"
ON public.admin_announcements
FOR SELECT
TO authenticated
USING (
  is_approved(auth.uid())
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    center_id IS NULL
    OR center_id = (SELECT center_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);
