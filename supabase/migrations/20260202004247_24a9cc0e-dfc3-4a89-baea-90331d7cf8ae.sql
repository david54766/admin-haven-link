-- Create videos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload videos
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' 
  AND public.is_admin(auth.uid())
);

-- Allow admins to update videos
CREATE POLICY "Admins can update videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'videos' 
  AND public.is_admin(auth.uid())
);

-- Allow admins to delete videos
CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND public.is_admin(auth.uid())
);

-- Allow approved users to view videos (public bucket for playback)
CREATE POLICY "Approved users can view videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' 
  AND public.is_approved(auth.uid())
);