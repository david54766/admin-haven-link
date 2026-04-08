-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view branding assets (public bucket)
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Only super admins can upload/update branding assets
CREATE POLICY "Super admins can manage branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update branding assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete branding assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);