-- Create admin announcements table
CREATE TABLE public.admin_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

-- Admins can manage announcements
CREATE POLICY "Admins can manage announcements"
ON public.admin_announcements
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Approved users can view active announcements
CREATE POLICY "Approved users can view active announcements"
ON public.admin_announcements
FOR SELECT
USING (
  is_approved(auth.uid()) 
  AND is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Add trigger for updated_at if needed later
COMMENT ON TABLE public.admin_announcements IS 'Admin announcements visible to staff on dashboard';