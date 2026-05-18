import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CertificateRenderer } from '@/components/CertificateRenderer';
import type { TextField } from '@/components/admin/CertificateTemplateEditor';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface StaffCert {
  id: string;
  title: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  hours: number | null;
  file_url: string | null;
  file_name: string | null;
}

interface EarnedCert {
  id: string;
  source: 'track' | 'module';
  staff_name: string;
  center_name: string;
  instructor_name: string;
  track_title: string;
  module_title?: string;
  hours_earned: number;
  issued_at: string;
  certificate_number: string;
  expiry_date: string | null;
  track_id: string | null;
  template?: { background_image_url: string | null; text_fields: TextField[] } | null;
}

const defaultFields: TextField[] = [
  { id: '1', label: 'Title', content_key: 'custom_text', x: 20, y: 10, width: 65, height: 10, fontSize: 32, fontFamily: 'Georgia, serif', color: '#1a365d', textAlign: 'center', fontWeight: 'bold' },
  { id: '3', label: 'Staff Name', content_key: 'staff_name', x: 20, y: 30, width: 65, height: 12, fontSize: 38, fontFamily: 'Georgia, serif', color: '#1a202c', textAlign: 'center', fontWeight: 'bold' },
  { id: '4', label: 'Center', content_key: 'center_name', x: 20, y: 43, width: 65, height: 6, fontSize: 16, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal' },
  { id: '5', label: 'Track', content_key: 'track_title', x: 20, y: 52, width: 65, height: 8, fontSize: 22, fontFamily: 'Georgia, serif', color: '#2b6cb0', textAlign: 'center', fontWeight: 'bold' },
  { id: '6', label: 'Hours', content_key: 'hours_earned', x: 20, y: 62, width: 65, height: 6, fontSize: 15, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal' },
  { id: '7', label: 'Date', content_key: 'issued_date', x: 20, y: 74, width: 30, height: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal' },
  { id: '8', label: 'Instructor', content_key: 'instructor_name', x: 55, y: 74, width: 30, height: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal' },
  { id: '9', label: 'Cert #', content_key: 'certificate_number', x: 20, y: 88, width: 65, height: 5, fontSize: 10, fontFamily: 'Georgia, serif', color: '#9ca3af', textAlign: 'center', fontWeight: 'normal' },
];

// Page geometry: US Letter landscape in pt = 792 x 612, margin 0.4in = 28.8pt
const PAGE_W = 792;
const PAGE_H = 612;
const MARGIN = 28.8;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_H = PAGE_H - MARGIN * 2;

// Render dimensions for off-screen certificate (1.414 aspect to match renderer)
const RENDER_W = 1414;
const RENDER_H = Math.round(RENDER_W / 1.414);

export default function CertificatesBatchPrint() {
  const { user } = useAuth();
  const [staffCerts, setStaffCerts] = useState<StaffCert[]>([]);
  const [earned, setEarned] = useState<EarnedCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const certRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const coverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const load = async () => {
    try {
      const [sc, tc, mc] = await Promise.all([
        supabase.from('staff_certificates').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('track_certificates').select('*').eq('user_id', user!.id).order('issued_at', { ascending: false }),
        supabase.from('module_certificates').select('*').eq('user_id', user!.id).order('issued_at', { ascending: false }),
      ]);

      const staff = (sc.data || []) as StaffCert[];
      setStaffCerts(staff);

      const earnedList: EarnedCert[] = [
        ...((tc.data || []) as any[]).map((r) => ({
          id: r.id, source: 'track' as const, staff_name: r.staff_name, center_name: r.center_name,
          instructor_name: r.instructor_name, track_title: r.track_title, hours_earned: r.hours_earned,
          issued_at: r.issued_at, certificate_number: r.certificate_number, expiry_date: r.expiry_date,
          track_id: r.track_id,
        })),
        ...((mc.data || []) as any[]).map((r) => ({
          id: r.id, source: 'module' as const, staff_name: r.staff_name, center_name: r.center_name,
          instructor_name: r.instructor_name, track_title: r.track_title, module_title: r.module_title,
          hours_earned: r.hours_earned, issued_at: r.issued_at, certificate_number: r.certificate_number,
          expiry_date: r.expiry_date, track_id: r.track_id,
        })),
      ];

      const trackIds = Array.from(new Set(earnedList.map((e) => e.track_id).filter(Boolean))) as string[];
      const templates: Record<string, { background_image_url: string | null; text_fields: TextField[] }> = {};
      if (trackIds.length) {
        const { data: tracks } = await supabase
          .from('training_tracks')
          .select('id, certificate_template_id')
          .in('id', trackIds);
        const tmplIds = (tracks || []).map((t: any) => t.certificate_template_id).filter(Boolean);
        const tmplMap: Record<string, any> = {};
        if (tmplIds.length) {
          const { data: tmpls } = await supabase
            .from('certificate_templates')
            .select('id, background_image_url, text_fields')
            .in('id', tmplIds);
          for (const t of tmpls || []) tmplMap[(t as any).id] = t;
        }
        for (const t of tracks || []) {
          const tmpl = tmplMap[(t as any).certificate_template_id];
          if (tmpl) {
            templates[(t as any).id] = {
              background_image_url: tmpl.background_image_url,
              text_fields: (tmpl.text_fields as any) || defaultFields,
            };
          }
        }
      }
      for (const e of earnedList) {
        if (e.track_id && templates[e.track_id]) e.template = templates[e.track_id];
      }
      setEarned(earnedList);

      const uploaded = staff.filter((c) => c.file_url);
      const urls: Record<string, string> = {};
      for (const c of uploaded) {
        // strip absolute prefix if present
        let path = c.file_url!;
        const marker = '/storage/v1/object/public/certificates/';
        const idx = path.indexOf(marker);
        if (idx !== -1) path = decodeURIComponent(path.slice(idx + marker.length).split('?')[0]);
        const { data } = await supabase.storage.from('certificates').createSignedUrl(path, 60 * 60);
        if (data?.signedUrl) urls[c.id] = data.signedUrl;
      }
      setSignedUrls(urls);
    } finally {
      setLoading(false);
    }
  };

  // Fit a source rectangle into the content area, returning {x, y, w, h} centered
  const fitRect = (srcW: number, srcH: number) => {
    const ratio = Math.min(CONTENT_W / srcW, CONTENT_H / srcH);
    const w = srcW * ratio;
    const h = srcH * ratio;
    const x = MARGIN + (CONTENT_W - w) / 2;
    const y = MARGIN + (CONTENT_H - h) / 2;
    return { x, y, w, h };
  };

  const snapshotNode = async (node: HTMLElement): Promise<string> => {
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const loadImageEl = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  const downloadPdf = async () => {
    setGenerating(true);
    const totalSteps =
      1 /* cover */ +
      earned.length +
      staffCerts.filter((c) => signedUrls[c.id]).length;
    setProgress({ current: 0, total: totalSteps });

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
      let step = 0;
      const tick = () => {
        step += 1;
        setProgress({ current: step, total: totalSteps });
      };

      // Cover
      if (coverRef.current) {
        const dataUrl = await snapshotNode(coverRef.current);
        // Cover renders portrait-ish; fit to page
        const img = await loadImageEl(dataUrl);
        const r = fitRect(img.naturalWidth, img.naturalHeight);
        doc.addImage(dataUrl, 'JPEG', r.x, r.y, r.w, r.h);
        tick();
      }

      // Earned certificates
      for (const e of earned) {
        const node = certRefs.current[`earned-${e.id}`];
        if (!node) { tick(); continue; }
        const dataUrl = await snapshotNode(node);
        doc.addPage('letter', 'landscape');
        const r = fitRect(RENDER_W, RENDER_H);
        doc.addImage(dataUrl, 'JPEG', r.x, r.y, r.w, r.h);
        tick();
      }

      // Uploaded certificates
      for (const c of staffCerts) {
        const url = signedUrls[c.id];
        if (!url) continue;
        const isPdf = /\.pdf($|\?)/i.test(url) || /\.pdf$/i.test(c.file_name || '');
        try {
          if (isPdf) {
            // Render each PDF page
            const resp = await fetch(url);
            const buf = await resp.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
            for (let p = 1; p <= pdf.numPages; p += 1) {
              const page = await pdf.getPage(p);
              const viewport = page.getViewport({ scale: 2 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext('2d')!;
              await page.render({ canvas, canvasContext: ctx, viewport }).promise;
              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
              doc.addPage('letter', 'landscape');
              const r = fitRect(canvas.width, canvas.height);
              doc.addImage(dataUrl, 'JPEG', r.x, r.y, r.w, r.h);
            }
          } else {
            const img = await loadImageEl(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')!.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            doc.addPage('letter', 'landscape');
            const r = fitRect(img.naturalWidth, img.naturalHeight);
            doc.addImage(dataUrl, 'JPEG', r.x, r.y, r.w, r.h);
          }
        } catch (err) {
          console.error('Failed to embed uploaded certificate', c.id, err);
        }
        tick();
      }

      doc.save(`certificate-batch-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading certificates…</div>;

  const totalHours = earned.reduce((s, e) => s + Number(e.hours_earned || 0), 0)
    + staffCerts.reduce((s, c) => s + Number(c.hours || 0), 0);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-lg font-semibold">Certificate Batch Report</h1>
        <div className="flex items-center gap-3">
          {progress && (
            <span className="text-sm text-muted-foreground">
              Rendering {progress.current} of {progress.total}…
            </span>
          )}
          <Button onClick={downloadPdf} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </div>
      </div>

      {/* On-screen preview */}
      <div className="p-6 space-y-8 max-w-5xl mx-auto">
        {/* Summary cover (also captured to PDF) */}
        <div ref={coverRef} className="bg-white p-10 border" style={{ width: '100%' }}>
          <h2 className="text-3xl font-bold mb-1">Certificate Report</h2>
          <p className="text-sm text-gray-600 mb-6">Generated {format(new Date(), 'MMMM d, yyyy')}</p>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border rounded p-4"><div className="text-xs text-gray-500">Earned Certificates</div><div className="text-2xl font-bold">{earned.length}</div></div>
            <div className="border rounded p-4"><div className="text-xs text-gray-500">Uploaded Certificates</div><div className="text-2xl font-bold">{staffCerts.length}</div></div>
            <div className="border rounded p-4"><div className="text-xs text-gray-500">Total Hours</div><div className="text-2xl font-bold">{totalHours.toFixed(1)}</div></div>
          </div>

          <h3 className="font-semibold mb-2 mt-6">Earned (Training Tracks & Modules)</h3>
          <table className="w-full text-sm mb-6 border">
            <thead><tr className="bg-gray-100">
              <th className="text-left p-2">Title</th><th className="text-left p-2">Type</th>
              <th className="text-left p-2">Issued</th><th className="text-left p-2">Hours</th>
              <th className="text-left p-2">Cert #</th>
            </tr></thead>
            <tbody>
              {earned.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{e.module_title || e.track_title}</td>
                  <td className="p-2 capitalize">{e.source}</td>
                  <td className="p-2">{format(new Date(e.issued_at), 'MMM d, yyyy')}</td>
                  <td className="p-2">{Number(e.hours_earned).toFixed(1)}</td>
                  <td className="p-2 text-xs">{e.certificate_number}</td>
                </tr>
              ))}
              {!earned.length && <tr><td colSpan={5} className="p-3 text-center text-gray-500">None</td></tr>}
            </tbody>
          </table>

          <h3 className="font-semibold mb-2">Uploaded Certificates</h3>
          <table className="w-full text-sm border">
            <thead><tr className="bg-gray-100">
              <th className="text-left p-2">Title</th><th className="text-left p-2">Organization</th>
              <th className="text-left p-2">Issued</th><th className="text-left p-2">Expires</th>
              <th className="text-left p-2">Hours</th>
            </tr></thead>
            <tbody>
              {staffCerts.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.title}</td>
                  <td className="p-2">{c.issuing_organization || '—'}</td>
                  <td className="p-2">{c.issue_date ? format(new Date(c.issue_date), 'MMM d, yyyy') : '—'}</td>
                  <td className="p-2">{c.expiry_date ? format(new Date(c.expiry_date), 'MMM d, yyyy') : '—'}</td>
                  <td className="p-2">{c.hours ?? '—'}</td>
                </tr>
              ))}
              {!staffCerts.length && <tr><td colSpan={5} className="p-3 text-center text-gray-500">None</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Earned certificate visuals (visible preview) */}
        {earned.map((e) => (
          <div key={e.id} className="max-w-4xl mx-auto border">
            <CertificateRenderer
              textFields={e.template?.text_fields?.length ? e.template.text_fields : defaultFields}
              backgroundImageUrl={e.template?.background_image_url || '/images/default-certificate-bg.png'}
              data={{
                staff_name: e.staff_name,
                track_title: e.track_title,
                module_title: e.module_title,
                center_name: e.center_name,
                instructor_name: e.instructor_name,
                hours_earned: e.hours_earned,
                issued_date: format(new Date(e.issued_at), 'MMMM d, yyyy'),
                expiry_date: e.expiry_date ? format(new Date(e.expiry_date), 'MMMM d, yyyy') : undefined,
                certificate_number: e.certificate_number,
              }}
            />
          </div>
        ))}

        {staffCerts.filter((c) => signedUrls[c.id] && /\.(png|jpg|jpeg|gif|webp)$/i.test(c.file_name || c.file_url || '')).map((c) => (
          <div key={c.id} className="max-w-4xl mx-auto">
            <h3 className="font-semibold mb-2">{c.title}</h3>
            <img src={signedUrls[c.id]} alt={c.title} className="max-w-full border" />
          </div>
        ))}
      </div>

      {/* Off-screen high-res render targets for PDF capture */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: '-100000px',
          top: 0,
          width: RENDER_W,
          pointerEvents: 'none',
        }}
      >
        {earned.map((e) => (
          <div
            key={`render-${e.id}`}
            ref={(el) => { certRefs.current[`earned-${e.id}`] = el; }}
            style={{ width: RENDER_W, height: RENDER_H, background: '#fff' }}
          >
            <CertificateRenderer
              textFields={e.template?.text_fields?.length ? e.template.text_fields : defaultFields}
              backgroundImageUrl={e.template?.background_image_url || '/images/default-certificate-bg.png'}
              data={{
                staff_name: e.staff_name,
                track_title: e.track_title,
                module_title: e.module_title,
                center_name: e.center_name,
                instructor_name: e.instructor_name,
                hours_earned: e.hours_earned,
                issued_date: format(new Date(e.issued_at), 'MMMM d, yyyy'),
                expiry_date: e.expiry_date ? format(new Date(e.expiry_date), 'MMMM d, yyyy') : undefined,
                certificate_number: e.certificate_number,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
