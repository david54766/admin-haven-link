## Goal

1. Per-tenant **certificate expiry reminders** at 7/15/30/60/90 days before expiry, automated daily, with each window toggleable in the admin **Settings** tab.
2. **Update** button on each certificate (admin + staff views) that records new info + uploads a new file, while **archiving** the prior file/info into a collapsible "Previous certificate" section.

## Scope

### A. Reminder windows (per tenant, configurable)

- New `system_settings` row per tenant with `key = 'certificate_expiry_reminders'`, value:
  ```json
  { "enabled": true, "windows": [7, 15, 30, 60, 90] }
  ```
  Defaults applied if missing.
- New tab in `AdminSettings.tsx` ("Certificates" or merged into Compliance) with checkboxes for each of the 5 windows + a master enable toggle. Saves to `system_settings`.

### B. Automated daily job

- Edge function `send-certificate-expiry-notifications` rewritten to **iterate every active tenant**:
  - Read tenant's settings (defaults if absent); skip if disabled.
  - For scheduled mode, only notify certificates whose `expiry_date - today` exactly matches one of the enabled windows.
  - Use per-tenant branding from `tenants.branding` (name/logo/color) instead of global `system_settings.branding`.
  - Fetch admin emails scoped to that tenant via `user_roles` joined with `profiles.tenant_id`.
  - Insert into new `certificate_expiry_notifications` table to dedupe sends per (certificate_id, days_window, date).
  - Manual mode (existing button / per-user) keeps behaviour: send all upcoming within 90 days regardless of window match.
- Migration adds `pg_cron` daily job (8am UTC) calling the function with `{"mode":"scheduled"}`.

### C. Update certificate + previous-certificate archive

- New table `staff_certificate_history`:
  - `id, certificate_id (fk), user_id, tenant_id, title, issuing_organization, issue_date, expiry_date, certificate_number, file_url, file_name, hours, notes, archived_at`
  - RLS: admins (own tenant) full access; staff can SELECT own rows.
- Reusable `UpdateCertificateDialog` component (used in both admin and staff certificate pages):
  - Prefilled with current values; required: new file (or option to keep file).
  - On save: insert snapshot of current cert into `staff_certificate_history`, then `update` `staff_certificates` with new values.
- Both `AdminCertificatesHours.tsx` and `CertificatesHours.tsx`:
  - Add **Update** action button per certificate row/card.
  - Render a collapsible **"Previous certificate"** section (Accordion / Collapsible) under each certificate, listing all archived versions with file links, dates, and metadata.

### D. Cleanup

- Update toast copy on "Send Expiry Notifications" button to reflect configurable windows.

## Technical details

**Migration 1 — history + notification log:**
```sql
CREATE TABLE public.staff_certificate_history ( ... );
ALTER TABLE ... ENABLE RLS;
CREATE POLICY "Admins manage history" ON public.staff_certificate_history
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) AND tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users view own history" ON public.staff_certificate_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER set_tenant_id_on_staff_certificate_history
  BEFORE INSERT ON public.staff_certificate_history
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_from_user();

CREATE TABLE public.certificate_expiry_notifications (
  id uuid PK default gen_random_uuid(),
  certificate_id uuid, user_id uuid, tenant_id uuid,
  days_window int, sent_on date default current_date, sent_at timestamptz default now(),
  UNIQUE (certificate_id, days_window, sent_on)
);
```

**Migration 2 — pg_cron job** (uses `supabase--insert` with anon key in headers since it contains project URL):
```sql
SELECT cron.schedule('certificate-expiry-daily', '0 8 * * *', $$
  SELECT net.http_post(
    url:='https://hocgvjyjrzlppjereirh.supabase.co/functions/v1/send-certificate-expiry-notifications',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON>"}'::jsonb,
    body:='{"mode":"scheduled"}'::jsonb
  );
$$);
```

**Edge function rewrite** (`supabase/functions/send-certificate-expiry-notifications/index.ts`):
- Loop tenants → load settings → load expiring certs → match windows → check `certificate_expiry_notifications` for dedupe → send via Resend with per-tenant branding → record send.

**Frontend files touched:**
- `src/pages/admin/AdminSettings.tsx` — new Certificates tab.
- `src/components/admin/CertificateRemindersSettings.tsx` (new).
- `src/components/UpdateCertificateDialog.tsx` (new, reusable).
- `src/components/PreviousCertificateAccordion.tsx` (new, reusable).
- `src/pages/admin/AdminCertificatesHours.tsx` — Update button + history accordion.
- `src/pages/CertificatesHours.tsx` — Update button + history accordion (staff view).

## Out of scope

- SMS/push notifications.
- Per-staff window overrides (windows are tenant-wide).
- Editing/deleting archived versions (read-only history).