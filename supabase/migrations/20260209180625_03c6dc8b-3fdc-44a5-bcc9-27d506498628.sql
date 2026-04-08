
-- Add is_important flag to shared_resources
ALTER TABLE public.shared_resources ADD COLUMN is_important boolean NOT NULL DEFAULT false;

-- Create table to track staff submissions for important documents
CREATE TABLE public.important_document_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.shared_resources(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid NULL,
  reviewed_at timestamp with time zone NULL,
  status text NOT NULL DEFAULT 'submitted',
  notes text NULL,
  UNIQUE(user_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.important_document_submissions ENABLE ROW LEVEL SECURITY;

-- Staff can manage their own submissions
CREATE POLICY "Users can manage own important doc submissions"
ON public.important_document_submissions
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view all submissions
CREATE POLICY "Admins can view all important doc submissions"
ON public.important_document_submissions
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can update submissions (for review)
CREATE POLICY "Admins can update important doc submissions"
ON public.important_document_submissions
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
