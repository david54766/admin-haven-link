CREATE POLICY "Admins can upload certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'certificates' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update certificates"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'certificates' AND public.is_admin(auth.uid()));