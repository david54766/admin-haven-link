

# Super Admin Tenant Management & Platform Updates

## Overview
Build a platform-level admin system for managing childcare organizations (tenants), update domain references to `childcarestafftraining.com`, redesign the landing page, and add welcome emails for new tenants.

## Step 1: Database Migration

Add `platform_admin` to the role enum, extend the `tenants` table, and add RLS policies.

```sql
-- Add platform_admin role
ALTER TYPE public.app_role ADD VALUE 'platform_admin';

-- Extend tenants table
ALTER TABLE public.tenants ADD COLUMN contact_email text;
ALTER TABLE public.tenants ADD COLUMN contact_name text;
ALTER TABLE public.tenants ADD COLUMN suspended_at timestamptz;
ALTER TABLE public.tenants ADD COLUMN max_users integer DEFAULT 50;

-- Security definer function for platform admin check
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'platform_admin'
) $$;

-- RLS on tenants: platform_admin full access, tenant users read own
CREATE POLICY "Platform admins can manage all tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

CREATE POLICY "Tenant users can view own tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (user_in_tenant(auth.uid(), id));
```

## Step 2: Auth & Routing Updates

- **`src/types/database.ts`** — Add `'platform_admin'` to `AppRole` union type
- **`src/contexts/AuthContext.tsx`** — Add `isPlatformAdmin` computed from roles, expose in context
- **`src/components/ProtectedRoute.tsx`** — Add `requirePlatformAdmin` prop; redirect non-platform-admins to `/dashboard`
- **`src/App.tsx`** — Add platform admin routes:
  - `/platform` → `PlatformDashboard` (requires `platformAdmin`)

## Step 3: Platform Admin UI

**New file: `src/pages/platform/PlatformDashboard.tsx`**

A single-page admin panel with:
- **Tenant table**: name, slug, contact email, status (active/suspended), user count, created date
- **Create Tenant dialog**: organization name, slug, contact name, contact email, admin password → calls `create-tenant-account` edge function
- **Suspend/Activate toggle** per tenant (updates `is_active` + `suspended_at`)
- **User count** per tenant (query profiles grouped by tenant_id)

Uses the existing `Layout` component with a platform-admin-specific nav.

## Step 4: Edge Function — `create-tenant-account`

**New file: `supabase/functions/create-tenant-account/index.ts`**

Accepts: `{ tenant_name, slug, contact_name, contact_email, admin_password }`

Flow:
1. Verify caller is `platform_admin` (check user_roles via service role client)
2. Insert row into `tenants` table
3. Create admin user via `auth.admin.createUser` (email confirmed)
4. Create profile linked to new tenant
5. Assign `director` role + link to tenant
6. Send welcome email via Resend with login credentials and portal URL (`https://childcarestafftraining.com/login`)

## Step 5: Update Domain References

Replace all `msjoschildcare.com` with `childcarestafftraining.com` across 9 edge functions:
- `create-user-account`, `send-registration-email`, `send-approval-email`, `send-password-reset`, `send-announcement-email`, `send-application-notification`, `send-checklist-notification`, `send-track-completion-email`, `send-certificate-expiry-notifications`

Changes: `from` email addresses → `noreply@childcarestafftraining.com`, login URLs → `https://childcarestafftraining.com`

## Step 6: Landing Page Redesign

**Rewrite `src/pages/Landing.tsx`** — remove Classroom Panda branding and logo imports, create a generic SaaS landing page:

- **Header**: "Childcare Staff Training" text logo + Login button
- **Hero**: "Training Management for Childcare Centers" — compliance tracking, certificates, professional development
- **Features grid**: Training Tracks, Compliance Documents, Certificates & Hours, Checklists, Calendar, Reports
- **CTA**: "Contact us to get started" (no signup/payment)
- **Footer**: `© 2026 childcarestafftraining.com`

No self-registration or payment flows — tenants are created by platform admin only.

## Step 7: Welcome Email Template

Built into the `create-tenant-account` edge function. Branded email including:
- Organization name
- Admin login credentials (email + temporary password)
- Login URL: `https://childcarestafftraining.com/login`
- Getting started instructions
- Sent from `noreply@childcarestafftraining.com`

## Files Changed Summary

| Action | File |
|--------|------|
| Migration | New SQL migration (enum + tenants columns + RLS + function) |
| Modify | `src/types/database.ts` |
| Modify | `src/contexts/AuthContext.tsx` |
| Modify | `src/components/ProtectedRoute.tsx` |
| Modify | `src/App.tsx` |
| Rewrite | `src/pages/Landing.tsx` |
| Create | `src/pages/platform/PlatformDashboard.tsx` |
| Create | `supabase/functions/create-tenant-account/index.ts` |
| Modify | 9 edge functions (domain replacement) |

