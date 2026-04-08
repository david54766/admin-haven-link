-- Create a public bucket for presentations
INSERT INTO storage.buckets (id, name, public)
VALUES ('presentations', 'presentations', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to presentations bucket
CREATE POLICY "Authenticated users can upload presentations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'presentations');

-- Allow public read access to presentations
CREATE POLICY "Public read access for presentations"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'presentations');

-- Allow admins to delete presentations
CREATE POLICY "Admins can delete presentations"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'presentations' AND public.is_admin(auth.uid()));