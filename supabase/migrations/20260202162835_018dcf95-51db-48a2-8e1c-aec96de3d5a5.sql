-- Create certificates table
CREATE TABLE public.staff_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  issuing_organization text,
  issue_date date,
  expiry_date date,
  certificate_number text,
  file_url text,
  file_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create hours log table
CREATE TABLE public.staff_hours_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  hours numeric(5,2) NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_hours_log ENABLE ROW LEVEL SECURITY;

-- Certificates policies
CREATE POLICY "Users can manage own certificates"
ON public.staff_certificates
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all certificates"
ON public.staff_certificates
FOR SELECT
USING (is_admin(auth.uid()));

-- Hours log policies
CREATE POLICY "Users can manage own hours"
ON public.staff_hours_log
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all hours"
ON public.staff_hours_log
FOR SELECT
USING (is_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_staff_certificates_updated_at
BEFORE UPDATE ON public.staff_certificates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_hours_log_updated_at
BEFORE UPDATE ON public.staff_hours_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);

-- Storage policies for certificates bucket
CREATE POLICY "Users can upload own certificates"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own certificates"
ON storage.objects
FOR SELECT
USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own certificates"
ON storage.objects
FOR DELETE
USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all certificates in storage"
ON storage.objects
FOR SELECT
USING (bucket_id = 'certificates' AND is_admin(auth.uid()));