## Problem

Completed tracks aren't producing certificates in the staff Certificates section.

**Root cause** in `src/pages/TrackDetail.tsx`: the auto-issue effect only fires on a transition from "not complete" → "complete" during a single page visit. The guard is:

```ts
previouslyCompletedRef = useRef<boolean | null>(null);  // starts null
if (isCurrentlyComplete && previouslyCompletedRef.current === false) { issueCertificate(); }
```

Because the ref starts at `null` (not `false`), if a staff member opens a track that is *already* 100% complete (the common case for tracks completed before this code shipped, or anyone revisiting later), the condition is never true and no certificate is ever inserted into `track_certificates`. The certificate also never issues for users who completed a track but never returned to that track's page afterwards.

There is also no client-side auto-issuance for module-level certificates — only the admin "retroactive" edge function handles those.

## Fix

### 1. `src/pages/TrackDetail.tsx` — issue whenever eligible

Change the effect so it issues a certificate any time the track is 100% complete, the track has `certificate_enabled` + `instructor_name`, and no `existingCertificateId` is already set. Keep the existing completion notification on the false→true transition (so it doesn't spam on every revisit), but decouple cert issuance from the transition.

`issueCertificate()` already guards on `existingCertificateId` so re-runs are safe, and the DB insert is idempotent per `(user_id, track_id)` via the existing query that loads `existingCertificateId`.

### 2. Auto-backfill on the staff Training → Certificates tab

In `src/pages/Training.tsx`, when the user opens the page (or switches to the `certificates` tab), call the existing `issue-retroactive-certificates` edge function scoped to that user's tenant. This catches every historical completion (tracks **and** modules) without requiring the staff member to revisit each track page.

To keep this safe and cheap:
- Only call it once per session (guard with a `sessionStorage` flag like `retroactive-certs-run:<tenantId>`).
- Fire-and-forget; on success, refetch the certificates list so any newly-issued certs appear immediately.

### 3. Edge function permission check

`issue-retroactive-certificates/index.ts` currently rejects non-admins (`is_admin` check returns 403). Update it to also allow approved staff to run it **for their own tenant only** — when the caller is not an admin, force `tenant_id` to the caller's own tenant (via `get_user_tenant_id`) and ignore any `track_id` override. Admins keep full behavior.

## Technical notes

- No DB schema changes needed.
- No new tables or RLS policies — existing `track_certificates` / `module_certificates` policies already allow `user_id = auth.uid()` inserts.
- The retroactive function already inserts both track- and module-level certificates and skips users who already have one, so repeat runs are harmless.

## Files touched

- `src/pages/TrackDetail.tsx` — relax auto-issue guard
- `src/pages/Training.tsx` — call retroactive function once per session, refresh cert list
- `supabase/functions/issue-retroactive-certificates/index.ts` — allow staff to backfill their own tenant
