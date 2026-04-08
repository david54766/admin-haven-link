-- Create application form fields table for dynamic form builder
CREATE TABLE public.application_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text', -- text, textarea, email, phone, select, checkbox
  field_options jsonb DEFAULT '[]'::jsonb, -- For select fields: array of options
  placeholder text,
  is_required boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  is_system_field boolean NOT NULL DEFAULT false, -- System fields can't be deleted (name, email, password)
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_form_fields ENABLE ROW LEVEL SECURITY;

-- Policies: Super admins can manage, public can view enabled fields
CREATE POLICY "Admins can manage application fields"
ON public.application_form_fields
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Public can view enabled application fields"
ON public.application_form_fields
FOR SELECT
USING (is_enabled = true);

-- Create trigger for updated_at
CREATE TRIGGER update_application_form_fields_updated_at
BEFORE UPDATE ON public.application_form_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system fields
INSERT INTO public.application_form_fields (field_name, field_label, field_type, placeholder, is_required, is_system_field, order_index) VALUES
('fullName', 'Full Name', 'text', 'John Smith', true, true, 0),
('email', 'Email Address', 'email', 'john@example.com', true, true, 1),
('phone', 'Phone Number', 'phone', '(555) 123-4567', false, false, 2),
('applicationMessage', 'Why do you want to join our team?', 'textarea', 'Tell us about yourself and why you''re interested in working with us...', false, false, 3);

-- Create application notification recipients table
CREATE TABLE public.application_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_notification_recipients ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can manage
CREATE POLICY "Admins can manage notification recipients"
ON public.application_notification_recipients
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));