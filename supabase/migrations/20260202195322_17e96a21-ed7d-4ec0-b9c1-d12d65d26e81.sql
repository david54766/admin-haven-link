-- Create table for admin responses to reflections
CREATE TABLE public.reflection_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reflection_id UUID NOT NULL REFERENCES public.self_reflections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reflection_responses ENABLE ROW LEVEL SECURITY;

-- Admins can insert responses to non-private reflections
CREATE POLICY "Admins can insert responses to shared reflections"
ON public.reflection_responses
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.self_reflections 
    WHERE id = reflection_id AND is_private = false
  )
);

-- Admins can view all responses
CREATE POLICY "Admins can view all responses"
ON public.reflection_responses
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can update their own responses
CREATE POLICY "Admins can update own responses"
ON public.reflection_responses
FOR UPDATE
USING (is_admin(auth.uid()) AND user_id = auth.uid());

-- Admins can delete their own responses
CREATE POLICY "Admins can delete own responses"
ON public.reflection_responses
FOR DELETE
USING (is_admin(auth.uid()) AND user_id = auth.uid());

-- Users can view responses on their own reflections
CREATE POLICY "Users can view responses on own reflections"
ON public.reflection_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.self_reflections 
    WHERE id = reflection_id AND user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_reflection_responses_updated_at
BEFORE UPDATE ON public.reflection_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();