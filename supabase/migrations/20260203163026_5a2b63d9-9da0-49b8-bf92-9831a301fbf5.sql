-- Create table for PowerPoint presentations in modules
CREATE TABLE public.module_presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for PDF documents in modules
CREATE TABLE public.module_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.module_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for module_presentations
CREATE POLICY "Admins can manage presentations" 
ON public.module_presentations 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Approved users can view presentations" 
ON public.module_presentations 
FOR SELECT 
USING (is_approved(auth.uid()));

-- RLS policies for module_documents
CREATE POLICY "Admins can manage documents" 
ON public.module_documents 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Approved users can view documents" 
ON public.module_documents 
FOR SELECT 
USING (is_approved(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_module_presentations_updated_at
BEFORE UPDATE ON public.module_presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_module_documents_updated_at
BEFORE UPDATE ON public.module_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();