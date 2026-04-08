
-- Allow authenticated users to upload to certificates bucket
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- Allow authenticated users to read certificates
CREATE POLICY "Authenticated users can read certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'certificates');

-- Allow authenticated users to update their own certificates
CREATE POLICY "Authenticated users can update certificates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'certificates');

-- Allow authenticated users to delete their own certificates
CREATE POLICY "Authenticated users can delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'certificates');
