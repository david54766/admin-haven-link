
-- Checklist templates (admin creates these)
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checklist templates"
ON public.checklist_templates FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Approved users can view active checklist templates"
ON public.checklist_templates FOR SELECT
USING (is_approved(auth.uid()) AND is_active = true);

-- Checklist items (items within a template)
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checklist items"
ON public.checklist_items FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Approved users can view checklist items"
ON public.checklist_items FOR SELECT
USING (is_approved(auth.uid()));

-- Checklist submissions (staff submits one per day per template)
CREATE TABLE public.checklist_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id, submission_date)
);

ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own checklist submissions"
ON public.checklist_submissions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all checklist submissions"
ON public.checklist_submissions FOR SELECT
USING (is_admin(auth.uid()));

-- Checklist submission items (individual item responses)
CREATE TABLE public.checklist_submission_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.checklist_submissions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_submission_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own submission items"
ON public.checklist_submission_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.checklist_submissions cs 
  WHERE cs.id = submission_id AND cs.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.checklist_submissions cs 
  WHERE cs.id = submission_id AND cs.user_id = auth.uid()
));

CREATE POLICY "Admins can view all submission items"
ON public.checklist_submission_items FOR SELECT
USING (is_admin(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_checklist_templates_updated_at
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
