-- Create presentation progress table
CREATE TABLE public.presentation_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  presentation_id UUID NOT NULL REFERENCES public.module_presentations(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, presentation_id)
);

-- Create document progress table (for PDFs)
CREATE TABLE public.document_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.module_documents(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, document_id)
);

-- Enable RLS
ALTER TABLE public.presentation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for presentation_progress
CREATE POLICY "Users can manage own presentation progress"
ON public.presentation_progress
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all presentation progress"
ON public.presentation_progress
FOR SELECT
USING (public.is_admin(auth.uid()));

-- RLS policies for document_progress
CREATE POLICY "Users can manage own document progress"
ON public.document_progress
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all document progress"
ON public.document_progress
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_presentation_progress_updated_at
BEFORE UPDATE ON public.presentation_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_progress_updated_at
BEFORE UPDATE ON public.document_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();