import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CertificateRenderer } from '@/components/CertificateRenderer';
import type { TextField } from '@/components/admin/CertificateTemplateEditor';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

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

export default function CertificatesBatchPrint() {
  const { user } = useAuth();
  const [staffCerts, setStaffCerts] = useState<StaffCert[]>([]);
  const [earned, setEarned] = useState<EarnedCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

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

      // Load templates per track
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

      // Get signed urls for any uploaded image files
      const imgCerts = staff.filter((c) => c.file_url && /\.(png|jpg|jpeg|gif|webp)$/i.test(c.file_url));
      const urls: Record<string, string> = {};
      for (const c of imgCerts) {
        const { data } = await supabase.storage.from('certificates').createSignedUrl(c.file_url!, 60 * 60);
        if (data?.signedUrl) urls[c.id] = data.signedUrl;
      }
      setSignedUrls(urls);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading certificates…</div>;

  const totalHours = earned.reduce((s, e) => s + Number(e.hours_earned || 0), 0)
    + staffCerts.reduce((s, c) => s + Number(c.hours || 0), 0);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="p-4 print:hidden border-b flex items-center justify-between sticky top-0 bg-white z-10">
        <h1 className="text-lg font-semibold">Certificate Batch Report</h1>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      <style>{`
        @media print {
          @page { size: letter landscape; margin: 0.4in; }
          .page-break { page-break-after: always; }
          .no-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* Summary cover */}
      <div className="p-10 page-break">
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

      {/* One certificate per page (visual) */}
      {earned.map((e) => (
        <div key={e.id} className="p-6 page-break no-break">
          <div className="max-w-4xl mx-auto">
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
        </div>
      ))}

      {/* Uploaded image certificates */}
      {staffCerts.filter((c) => signedUrls[c.id]).map((c) => (
        <div key={c.id} className="p-6 page-break no-break">
          <div className="max-w-4xl mx-auto">
            <h3 className="font-semibold mb-2">{c.title}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {c.issuing_organization || '—'}
              {c.issue_date && ` • Issued ${format(new Date(c.issue_date), 'MMM d, yyyy')}`}
              {c.expiry_date && ` • Expires ${format(new Date(c.expiry_date), 'MMM d, yyyy')}`}
            </p>
            <img src={signedUrls[c.id]} alt={c.title} className="max-w-full border" />
          </div>
        </div>
      ))}
    </div>
  );
}
