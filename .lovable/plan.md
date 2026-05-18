## Goal

Make the Certificates → "Print Batch" feature produce a real downloadable **PDF file** that contains the **actual visual certificates** (rendered images), not just a browser print dialog.

## Current behavior

`src/pages/CertificatesBatchPrint.tsx` renders certificates as HTML and relies on `window.print()` → Save as PDF. This is unreliable (depends on user's browser/print settings) and doesn't guarantee the certificate visuals are captured cleanly.

## Plan

1. **Switch to true PDF generation** using `jspdf` (already installed) + `html2canvas` (add).
   - For each earned certificate, render the `<CertificateRenderer>` off-screen at a fixed high-resolution size (e.g. 1414×1000) so backgrounds and text fields look sharp.
   - Use `html2canvas` to snapshot each rendered certificate into a PNG canvas.
   - Add each snapshot as a full landscape page in the jsPDF document (letter, landscape, ~0.4in margins).
   - For uploaded image certificates, embed the signed-URL image as its own page.
   - For uploaded PDF certificates, render their pages with `pdfjs-dist` (already used in `CertificateFileViewer`) to canvas and add those pages too.

2. **Keep the summary cover page** as page 1 — render it via the same html2canvas pipeline so it's part of the same PDF.

3. **UX**: 
   - Replace the "Print / Save as PDF" button with "Download PDF".
   - Show a progress indicator while pages are being rasterized (e.g. "Rendering 3 of 12…").
   - On completion, trigger `doc.save('certificate-batch-<date>.pdf')`.
   - Keep the existing on-screen preview for visual confirmation.

4. **Edge cases**:
   - If a certificate has no template/background, fall back to the default decorative border (already handled in `CertificateRenderer`).
   - Wait for background images to load (`img.decode()` / `onload`) before snapshotting so they're embedded.
   - Skip uploaded files whose signed URL fails, but log them in the summary.

## Files

- **Modify** `src/pages/CertificatesBatchPrint.tsx` — replace `window.print()` flow with jsPDF/html2canvas generation; render each certificate into a hidden, fixed-size container, snapshot, append.
- **Add** dependency: `html2canvas`.

## Technical notes

- Use `useRef` array to hold each certificate's DOM node; iterate sequentially to avoid memory spikes.
- `html2canvas(node, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })` for crisp output and to pull cross-origin Supabase storage images (storage URLs need to be signed/CORS-friendly — they already are).
- jsPDF page size: `new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })`; add image with `doc.addImage(dataUrl, 'PNG', x, y, w, h)` sized to page minus margins.
