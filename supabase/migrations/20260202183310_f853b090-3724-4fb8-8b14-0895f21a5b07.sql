-- Add download count column to shared_resources
ALTER TABLE public.shared_resources 
ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;

-- Create function to increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count(resource_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_resources
  SET download_count = download_count + 1
  WHERE id = resource_id;
END;
$$;