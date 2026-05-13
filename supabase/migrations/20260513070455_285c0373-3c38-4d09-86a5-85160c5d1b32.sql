
-- Certificate version history
CREATE TABLE public.staff_certificate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.staff_certificates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  title text NOT NULL,
  issuing_organization text,
  issue_date date,
  expiry_date date,
  certificate_number text,
  file_url text,
  file_name text,
  hours numeric,
  notes text,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid
);

CREATE INDEX idx_staff_cert_history_cert ON public.staff_certificate_history(certificate_id);
CREATE INDEX idx_staff_cert_history_tenant ON public.staff_certificate_history(tenant_id);

ALTER TABLE public.staff_certificate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cert history"
  ON public.staff_certificate_history
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users view own cert history"
  ON public.staff_certificate_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own cert history"
  ON public.staff_certificate_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_tenant_id_on_staff_certificate_history
  BEFORE INSERT ON public.staff_certificate_history
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Notification dedupe log
CREATE TABLE public.certificate_expiry_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  days_window int NOT NULL,
  sent_on date NOT NULL DEFAULT current_date,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (certificate_id, days_window, sent_on)
);

CREATE INDEX idx_cert_expiry_notif_tenant ON public.certificate_expiry_notifications(tenant_id);

ALTER TABLE public.certificate_expiry_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view cert expiry notifs"
  ON public.certificate_expiry_notifications
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
