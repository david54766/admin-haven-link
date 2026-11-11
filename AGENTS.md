# Project rules

- Training progress tenant ownership is derived from matching staff profile and parent content tenants; keep tenant-scoped access policies intact so admins see only their organization's progress.
- Open stored training/certificate files via src/lib/storageFile.ts (download as blob), never by raw storage URL — private buckets 404 on public links and some networks block the backend domain.
