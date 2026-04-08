-- Allow admins to upload to documents bucket
CREATE POLICY "Admins can upload to documents bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  is_admin(auth.uid())
);

-- Allow admins to delete from documents bucket
CREATE POLICY "Admins can delete from documents bucket"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  is_admin(auth.uid())
);

-- Allow approved users to read from documents bucket (for shared resources)
CREATE POLICY "Approved users can read documents bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  is_approved(auth.uid())
);