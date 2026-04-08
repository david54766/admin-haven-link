-- Create table for staff training hour goals
CREATE TABLE public.staff_training_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  required_hours NUMERIC NOT NULL DEFAULT 0,
  set_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE public.staff_training_goals ENABLE ROW LEVEL SECURITY;

-- Admins can manage all goals
CREATE POLICY "Admins can manage training goals"
ON public.staff_training_goals
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Users can view their own goals
CREATE POLICY "Users can view own goals"
ON public.staff_training_goals
FOR SELECT
USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_staff_training_goals_updated_at
BEFORE UPDATE ON public.staff_training_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();