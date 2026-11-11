# Fix the 6 Miracle Grow issues

## What I found
1. **CACFP training shows a black box.** The guide was saved to a private storage folder, but the viewer opens it with a public link. The storage service answers "Bucket not found", and that error is the text inside the box. The "complete" button still works because it doesn't check that the file actually loaded.
2. **Duplicate certificate.** When a track finishes, the system issues the in-house certificate and also saves a second copy as an "uploaded" certificate, which has no file. That copy is the Nov 9 entry with no View button.
3. **Staff view is missing certificates.** The "certificate(s) on file" count only includes uploaded certificates. Outside-course certificates (Anisa has 4 approved) never appear on the staff page.
4. **Progress mismatch.** The track detail page still counts progress its own way. The Training list and the admin view use the shared counter. I'll confirm this before changing it.
5. **Wrong hours and title.**
   - Mandated Reporter is set to **-23 hours** in its settings.
   - Program Plan & Curriculum is set to **0**.
   - Center-Wide Onboarding track certificates were issued with **0 hours** for 4 people.
   - Every certificate already issued copied those wrong numbers.
   - The certificate page prints the track name instead of the module name.
6. **"Unknown" names and duplicate accounts.**
   - Kyarra Edmond's 7 certificates belong to an account that no longer exists. That's why they show "Unknown".
   - Aniaya Beasley has two approved accounts: niayaali@ and photoaniaya@gmail.com.
   - Brandy Henry has two approved accounts: brandynicoleofficial@gmail.com and admin@miraclegrowlearningacademy.com.

## Fixes
1. Open training documents with a secure temporary link, and repair the existing broken links. Only allow "complete" once the file has actually opened.
2. Stop creating the extra "uploaded" copy when a track finishes, and remove the existing copies (same certificate number as the in-house one). Hours already logged stay as they are.
3. Staff Certificates page: one list covering uploaded, in-house and approved outside-course certificates, with the right count.
4. Make the track detail page use the shared counter, then check a staff member at 100% shows 100% in both views.
5. Hours: I need the correct numbers from you (see questions below). I'll update the module settings and every certificate already issued. I'll also block negative hours in the content editor and show module names on certificates.
6. Kyarra: link her certificates to her current account if she has one, or keep her name showing if she doesn't.
7. Merging accounts: you choose which email each person keeps. I'll move all certificates, progress, track assignments and hours onto that account, then disable the other one. Nothing is deleted.

## Questions for you before I start
- Correct hours for Mandated Reporter, Program Plan & Curriculum, and the Center-Wide Onboarding track.
- Which email Aniaya and Brandy should keep. Brandy's admin@ address may be the center's shared admin login. If so, keep it separate and don't merge?
- Is Kyarra still employed, and does she have a new email?

## Technical notes
- Use the existing blob/signed-URL viewer for `documents`-bucket items in the document viewer. Rewrite the stored public URLs to storage paths.
- Remove the `staff_certificates` insert in TrackDetail. Delete only rows whose certificate_number matches a track certificate and that have no file.
- TrackCertificate.tsx: pass `module_title` to the renderer.
- Hours fixes are data updates on modules, training_tracks, module_certificates and track_certificates, all limited to the Miracle Grow organization. Add a positive-number check in the content form.
- The merge is a one-off data move by user_id across the training progress, certificate and hours tables. The old profile gets status `disabled`. Respect the existing organization ownership triggers.
- Add a test for the hours rule (no negative hours).
