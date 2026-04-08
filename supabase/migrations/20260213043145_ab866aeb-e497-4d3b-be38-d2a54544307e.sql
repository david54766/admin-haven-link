
-- External training links within modules
CREATE TABLE public.module_external_trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  external_url TEXT NOT NULL,
  requires_certificate BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.module_external_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage external trainings"
  ON public.module_external_trainings FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Approved users can view external trainings"
  ON public.module_external_trainings FOR SELECT
  USING (is_approved(auth.uid()));

CREATE TRIGGER update_module_external_trainings_updated_at
  BEFORE UPDATE ON public.module_external_trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Staff submissions (certificate uploads or self-confirmation)
CREATE TABLE public.external_training_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_training_id UUID NOT NULL REFERENCES public.module_external_trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_url TEXT,
  file_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.external_training_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own external training submissions"
  ON public.external_training_submissions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all external training submissions"
  ON public.external_training_submissions FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update external training submissions"
  ON public.external_training_submissions FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
