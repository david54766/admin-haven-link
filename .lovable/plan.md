

## Recommendation: Tenant-scoped slug URLs + auto-tenant on admin-created accounts

For your two registration paths, I recommend a different strategy for each — they have different problems.

### 1. External (self-serve) registration → use **tenant slug in URL**

Already partially built (`/t/:slug/apply`, `/t/:slug/register`). Just lean into it.

**Why slug over PIN:**
- Zero friction — applicant clicks the link and the tenant is locked in. PINs add a step where users mistype, lose, or share the wrong code.
- You already have `TenantContext` resolving by slug, plus the `handle_new_user` trigger reads `tenant_id` from signup metadata. The plumbing is done.
- Slugs are shareable on flyers, QR codes, email signatures, your tenant's own website.
- PIN adds a new table, new validation logic, new admin UI to rotate/share PINs — extra surface area for the same outcome.

**What to add on top of what's already there:**
- In Admin Settings, surface the tenant's "Apply" and "Register" links (e.g. `https://childcarestafftraining.com/t/{slug}/apply`) with copy-to-clipboard buttons so directors can grab and share them.
- Optional: redirect the bare `/apply` and `/register` to a "choose your organization" page (or block them entirely for tenant signups) so no one accidentally lands in the platform tenant again.

### 2. Admin backend registration → **auto-assign to admin's tenant** (no slug, no PIN needed)

This is the part you nailed: when an admin creates a user, we already know the admin's tenant. The user should never have to identify it.

**Current bug:** `supabase/functions/create-user-account/index.ts` creates the profile without setting `tenant_id`, so it falls to the default platform tenant — same root cause as the self-serve issue.

**Fix:**
1. Look up the calling admin's `tenant_id` (via `get_user_tenant_id(callerUser.id)`) inside the edge function.
2. Set `tenant_id` on the profile upsert and the `user_roles` insert, so the new user belongs to the admin's organization from the moment they exist.
3. Reject the call if the admin somehow has no tenant (defensive check).

This means directors creating users from the Admin → Users page get correct, instant tenant assignment with no URL, no PIN, no approval-claim dance.

### Summary table

| Path | Mechanism | Why |
|---|---|---|
| Self-serve apply/register | Tenant slug URL `/t/{slug}/apply` | Already wired, frictionless, shareable |
| Admin creates user from backend | Auto-assign caller's `tenant_id` server-side | Admin's tenant is already known — never ask |
| Approval of stray platform-tenant users | Existing claim-on-approve trigger | Safety net for users who used bare `/apply` |

### Implementation steps (when approved)

1. **Edit `supabase/functions/create-user-account/index.ts`** — resolve caller's tenant via the admin client and pass `tenant_id` into both the `profiles` upsert and the `user_roles` insert.
2. **Add tenant-link panel to `src/pages/admin/AdminSettings.tsx`** — show `/t/{slug}/apply`, `/t/{slug}/register`, `/t/{slug}/login` with copy buttons. Resolve slug from the tenant record using current `tenant_id`.
3. **(Optional, ask first)** Update bare `/apply` and `/register` to a tenant-selector or remove from public navigation so the platform-tenant fallback stops accumulating users.

### Technical notes

- No new tables, no PIN infrastructure, no migrations required for steps 1–2.
- The existing `move_approved_user_to_admin_tenant` trigger remains as a safety net for the rare case that someone slips through the bare URLs.
- `tenants` table already has a `slug` column (used by `resolve_tenant_by_slug`), so the settings panel just needs to read it.

