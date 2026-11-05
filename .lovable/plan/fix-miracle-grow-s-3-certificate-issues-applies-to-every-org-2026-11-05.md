# Fix Miracle Grow's 3 certificate issues (applies to every organization)

## 1. Click a staff member to see all their certificates
- In Admin → Certificates & Hours, make each staff name clickable.
- It opens a staff detail panel with:
  - **Completed:** uploaded certificates, in-house track certificates and in-house module certificates, each with View / PDF.
  - **Not completed yet:** required trainings from their assigned tracks that have no certificate, plus any expired certificates.
  - A summary at the top (hours, how many completed vs. remaining) and a "Download PDF Batch" button for that person.

## 2. Staff shows 100%, admin shows 20/21 (95%)
- The staff page and the admin Reports page count completed items separately, so they can disagree. One clear gap: the admin count includes hidden (inactive) modules, which staff never see.
- First step: compare the real records for the staff member Anisa mentioned to find the exact item behind the 21st count.
- Fix: both pages will use the same counting rule (active modules only, the same "approved" rules for homework and outside courses). The admin row will also list any missing item by name, so admins can see what's left.

## 3. Admins can't see in-house certificates
- Admins already have permission to see them. The admin page just never loads **module** certificates (it only loads track certificates), and it doesn't show both kinds in the main list.
- Fix: load in-house module and track certificates, show them in the All Staff Certificates list with an "In-house" tag, and add a View button that opens the certificate image (the same one staff see). They'll also be included in the PDF batch.

## Technical notes
- `AdminCertificatesHours.tsx`: also query `module_certificates`, merge into the list with a source tag, and add a `StaffCertificateDetail` sheet.
- Pull the completion counting into a shared `src/lib/trackProgress.ts` that both `AdminReports.tsx` and the staff `TrackDetail`/`Training` pages use. Filter `modules.is_active`, and return the IDs of missing items.
- No database changes needed. The existing access rules already let tenant admins read both in-house certificate tables.
