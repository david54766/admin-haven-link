-- Add link_url column to shared_resources table
ALTER TABLE public.shared_resources
ADD COLUMN link_url text NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.shared_resources.link_url IS 'Optional external link URL for resources without file uploads';