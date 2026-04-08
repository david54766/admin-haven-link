
-- Create a public bucket for shared resources
INSERT INTO storage.buckets (id, name, public) VALUES ('shared-resources', 'shared-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read shared resources
CREATE POLICY "Authenticated users can view shared resources files"
ON storage.objects FOR SELECT
USING (bucket_id = 'shared-resources' AND auth.role() = 'authenticated');

-- Allow admins to upload shared resources
CREATE POLICY "Admins can upload shared resources files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shared-resources' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'director')
));

-- Allow admins to delete shared resources files
CREATE POLICY "Admins can delete shared resources files"
ON storage.objects FOR DELETE
USING (bucket_id = 'shared-resources' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'director')
));
