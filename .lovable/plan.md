## Goal
Let `info@easyfill.ai` (platform_admin) work inside any tenant's admin panel — view users, add training tracks, edit settings, etc. — without disrupting that tenant's data or the existing platform-admin UI.

## Recommended approach: "Act As Tenant" impersonation

A non-invasive pattern that gives the platform admin scoped, auditable access to any tenant by temporarily *behaving* as that tenant's admin. No RLS rewrites across 30+ tables, no permanent profile change, no shared-account hacks.

### How it works (user-facing)

1. On the Platform Dashboard (`/platform`), each tenant row gets a new **"Enter Tenant"** button.
2. Clicking it sets an active tenant for the session and routes the platform admin into the normal `/admin` dashboard, but every query/insert is scoped to that tenant.
3. A persistent banner at the top reads: **"Acting as: {Tenant Name} — Exit"**. Clicking Exit returns them to `/platform`.
4. The tenant's own admins see no change. Platform admin's own profile is never altered.

### Why this is the least invasive option

- **No bulk RLS changes.** The 30+ tables already have `is_admin(uid) AND tenant_id = get_user_tenant_id(uid)` policies. We do NOT touch those.
- **One small RLS extension per write path** is replaced by a single helper function update: `get_user_tenant_id()` and `is_admin()` get a thin override layer that respects an "active tenant" claim ONLY for platform admins.
- **No changes to tenant admins' experience.** Regular admins never see the new banner or routes.
- **Reversible.** Exiting impersonation is a single click; closing the tab also clears it.

## Technical design

### 1. Database: extend two SECURITY DEFINER helpers

Add a new function `get_effective_tenant_id(_user_id uuid)`:

```sql
-- Returns the impersonated tenant if the user is a platform_admin
-- and has set one via app.current_setting, else their real tenant.
create or replace function public.get_effective_tenant_id(_user_id uuid)
returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_override uuid;
begin
  if public.is_platform_admin(_user_id) then
    begin
      v_override := nullif(current_setting('app.acting_tenant_id', true), '')::uuid;
    exception when others then v_override := null;
    end;
    if v_override is not null then
      return v_override;
    end if;
  end if;
  return public.get_user_tenant_id(_user_id);
end;
$$;
```

Then update **only** `get_user_tenant_id` callers used in RLS policies — actually simpler: update `get_user_tenant_id` itself to delegate when a platform admin has set an override. This way **zero RLS policies need to change**.

```sql
create or replace function public.get_user_tenant_id(_user_id uuid)
returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_override uuid;
  v_real uuid;
begin
  if public.is_platform_admin(_user_id) then
    begin
      v_override := nullif(current_setting('app.acting_tenant_id', true), '')::uuid;
    exception when others then v_override := null;
    end;
    if v_override is not null then return v_override; end if;
  end if;
  select tenant_id into v_real from public.profiles where user_id = _user_id limit 1;
  return v_real;
end;
$$;
```

Also extend `is_admin(_user_id)` so platform admins are treated as admins of whatever tenant they are acting in (they already bypass most checks, but several RLS policies use `is_admin` not `is_platform_admin`):

```sql
create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role::text in ('admin','super_admin','director','platform_admin')
  )
$$;
```

### 2. Setting the override per request

Postgres `current_setting('app.acting_tenant_id')` is a session-level GUC. Supabase's PostgREST runs each request in its own connection from a pool, so we need to push the value with **request-scoped headers** that get translated into a `SET LOCAL`.

The clean Supabase-native way: a small RPC `set_acting_tenant(p_tenant_id uuid)` that the frontend calls **once per session** to set it via `pg_temp` is unreliable across pooled connections. Instead:

- Add an RPC that **stamps the override into a row** in a tiny `platform_admin_sessions` table keyed by `auth.uid()` with a 4-hour TTL.
- Modify `get_user_tenant_id` to read the override from that table (still only for platform admins).

```sql
create table public.platform_admin_sessions (
  user_id uuid primary key,
  acting_tenant_id uuid not null references public.tenants(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '4 hours',
  updated_at timestamptz not null default now()
);
alter table public.platform_admin_sessions enable row level security;
create policy "Platform admins manage own session"
  on public.platform_admin_sessions for all
  using (user_id = auth.uid() and is_platform_admin(auth.uid()))
  with check (user_id = auth.uid() and is_platform_admin(auth.uid()));
```

Final `get_user_tenant_id`:

```sql
create or replace function public.get_user_tenant_id(_user_id uuid)
returns uuid language plpgsql stable security definer set search_path = public
as $$
declare v_override uuid; v_real uuid;
begin
  if public.is_platform_admin(_user_id) then
    select acting_tenant_id into v_override
    from public.platform_admin_sessions
    where user_id = _user_id and expires_at > now();
    if v_override is not null then return v_override; end if;
  end if;
  select tenant_id into v_real from public.profiles where user_id = _user_id limit 1;
  return v_real;
end;
$$;
```

This is **per-user, per-row**, so connection pooling does not matter.

### 3. Frontend changes

- **`PlatformDashboard.tsx`**: add an **"Enter Tenant"** button per row. On click → upsert a row in `platform_admin_sessions` with that `tenant_id`, then `navigate('/admin')`.
- **`AuthContext.tsx`**: fetch the active impersonation row alongside the profile; expose `actingTenantId` and `actingTenantName`.
- **`ProtectedRoute.tsx`**: when `requireAdmin` is set and user is platform admin, allow through if `actingTenantId` is set OR keep current bypass.
- **New `ImpersonationBanner.tsx`**: sticky banner shown in `Layout.tsx` when `actingTenantId` is set. "Acting as **COD Kids** — [Exit Tenant]". Exit calls a delete on `platform_admin_sessions` and routes back to `/platform`.
- **`Layout.tsx`**: when impersonating, show the Settings link and other tenant-admin nav items (already gated by `!isPlatformAdmin` — relax to `!isPlatformAdmin || actingTenantId`).

### 4. Audit trail

Add a small `platform_admin_audit` table that logs each enter/exit with `user_id`, `tenant_id`, `action`, `created_at`. Insert from the same RPC. Optional but recommended for compliance.

## What this does NOT change

- No existing RLS policies are rewritten.
- No tenant data is migrated or touched.
- Tenant admins see no UI changes.
- Platform admin's `profiles.tenant_id` stays at the platform tenant.
- Email sending, notifications, certificates, etc. all work because they read tenant via the same helper.

## Files to change

- `supabase/migrations/<new>.sql` — new table, updated `get_user_tenant_id`, updated `is_admin`, audit table.
- `src/contexts/AuthContext.tsx` — load + expose `actingTenantId`.
- `src/components/Layout.tsx` — show admin nav + banner when impersonating.
- `src/components/ImpersonationBanner.tsx` — new.
- `src/components/ProtectedRoute.tsx` — allow platform admin into `/admin*` when impersonating.
- `src/pages/platform/PlatformDashboard.tsx` — "Enter Tenant" button + handler.

## Out of scope (intentionally)

- Cross-tenant content cloning (e.g., copy a track to multiple tenants) — can be a follow-up if you want to push shared training content.
- Time-bounded permission tiers (read-only vs full) — can be added later by storing a `mode` column on `platform_admin_sessions`.
