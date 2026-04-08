-- Create table for shared resources uploaded by admins
CREATE TABLE public.shared_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

-- Admins can manage shared resources
CREATE POLICY "Admins can manage shared resources"
ON public.shared_resources
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Approved users can view shared resources
CREATE POLICY "Approved users can view shared resources"
ON public.shared_resources
FOR SELECT
USING (is_approved(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_shared_resources_updated_at
BEFORE UPDATE ON public.shared_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();