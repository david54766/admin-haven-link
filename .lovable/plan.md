

# Multi-Tenant Architecture Plan

## What Multi-Tenancy Means Here

Right now, the app serves **one organization** with multiple locations (centers). Multi-tenancy would allow **multiple independent organizations** (tenants) to share the same app — each with their own staff, training content, branding, settings, and data, completely isolated from each other.

Example: "Ms. Jo's Childcare" and "Sunshine Academy" would both use this portal at their own URLs, never seeing each other's data.

---

## How It Would Work

### 1. Tenant Identification

Each organization gets a unique slug (e.g., `msjos`, `sunshine`). Tenants are identified by:
- **Subdomain**: `msjos.yourdomain.com` — or —
- **Path prefix**: `yourdomain.com/msjos` — or —
- **Custom domain**: `training.msjoschildcare.com`

A new `tenants` table stores each org's config (name, slug, branding, domain).

### 2. Data Isolation

Every major table gets a `tenant_id` column. All queries and RLS policies are scoped by tenant, so users in Org A can never see Org B's data.

**Tables that need `tenant_id` added:**
- `profiles`, `centers`, `training_tracks`, `modules`, `videos`, `quizzes`
- `admin_announcements`, `calendar_events`, `shared_resources`, `staff_documents`
- `staff_certificates`, `checklist_templates`, `expenses`, `positions`
- `system_settings`, `certificate_templates`, `application_form_fields`
- Essentially all non-UI tables

### 3. RLS Policy Changes

Every RLS policy gets an additional tenant check. A helper function like `get_user_tenant_id(auth.uid())` would be used across all policies to ensure cross-tenant isolation.

### 4. Branding Per Tenant

The current `system_settings` branding approach already works — it just needs to be keyed per tenant. Each tenant gets its own logo, colors, business name.

### 5. Auth & Onboarding

- Users sign up to a **specific tenant** (determined by the URL they visit)
- Their profile is linked to that tenant
- Admins/super_admins are scoped to their tenant
- A "platform super admin" role could exist above tenants for managing the whole system

---

## Scope of Changes

This is a **large architectural change** affecting:

| Area | Impact |
|------|--------|
| Database | ~30+ tables need `tenant_id` column + migration of existing data |
| RLS Policies | Every policy rewritten to include tenant scoping |
| Backend Functions | All edge functions need tenant awareness |
| Frontend Routing | Tenant resolution from URL on every page load |
| Auth Flow | Registration/login scoped to tenant |
| Admin Settings | Branding, content, users all per-tenant |
| Storage Buckets | File paths prefixed by tenant for isolation |

**Estimated effort**: This is a multi-week refactor touching nearly every file and table. It is the single largest structural change possible for this codebase.

---

## Recommended Approach

### Phase 1 — Foundation
- Create `tenants` table with slug, name, branding config
- Add `tenant_id` to `profiles` and core tables
- Build tenant resolution middleware (detect tenant from URL)
- Migrate existing data as "tenant #1"

### Phase 2 — Data Isolation
- Add `tenant_id` to all remaining tables
- Rewrite all RLS policies with tenant scoping
- Update all edge functions

### Phase 3 — Frontend
- Tenant-aware routing and branding initialization
- Scoped login/registration pages
- Admin UI for tenant management (platform-level)

### Phase 4 — Platform Admin
- Super-admin dashboard to create/manage tenants
- Tenant billing, usage metrics (optional)

---

## Alternative: Simpler "White-Label" Approach

If you just need to **deploy separate instances** for different clients (rather than true shared-database multi-tenancy), a simpler path is:
- Keep the current architecture as-is
- Deploy separate Lovable projects per client
- Each gets its own database and branding

This requires zero code changes but means managing multiple projects.

---

## Summary

True multi-tenancy is achievable but is a **major refactor** (30+ table migrations, all RLS policies, all edge functions, routing changes). The white-label alternative gives similar results with no code changes but more operational overhead.

Would you like to proceed with either approach?

