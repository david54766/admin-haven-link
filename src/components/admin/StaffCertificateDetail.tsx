import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, FileDown } from 'lucide-react';
import { computeTrackProgress } from '@/lib/trackProgress';

interface Props {
  userId: string | null;
  name?: string;
  email?: string;
  onOpenChange: (open: boolean) => void;
}

interface Row {
  id: string;
  title: string;
  kind: 'Uploaded' | 'In-house module' | 'In-house track';
  date: string | null;
  expiry: string | null;
  hours: number | null;
  link: string | null;
}

export function StaffCertificateDetail({ userId, name, email, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [missing, setMissing] = useState<{ track: string; module: string; title: string; type: string; pendingReview?: boolean }[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const q = (t: string, sel = '*') => (supabase.from(t as any).select(sel) as any).eq('user_id', userId);
      const [sc, tc, mc, asg, vp, pp, dp, lp, qa, hw, ext] = await Promise.all([
        q('staff_certificates'),
        q('track_certificates'),
        q('module_certificates'),
        q('staff_track_assignments', `track:training_tracks(title, modules(*, videos(*), quizzes(*), homework_assignments(*), module_presentations(*), module_documents(*), module_external_trainings(*), module_lessons(*)))`),
        q('video_progress'), q('presentation_progress'), q('document_progress'), q('lesson_progress'),
        q('quiz_attempts'), q('homework_submissions'), q('external_training_submissions'),
      ]);
      const r: Row[] = [
        ...(sc.data || []).map((c: any) => ({ id: c.id, title: c.title, kind: 'Uploaded' as const, date: c.issue_date, expiry: c.expiry_date, hours: c.hours, link: c.file_url ? `/certificate-file/${c.id}` : null })),
        ...(tc.data || []).map((c: any) => ({ id: c.id, title: c.track_title, kind: 'In-house track' as const, date: c.issued_at, expiry: c.expiry_date, hours: c.hours_earned, link: `/certificate/${c.id}` })),
        ...(mc.data || []).map((c: any) => ({ id: c.id, title: c.module_title, kind: 'In-house module' as const, date: c.issued_at, expiry: c.expiry_date, hours: c.hours_earned, link: `/certificate/${c.id}` })),
      ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setRows(r);
      const miss: typeof missing = [];
      for (const a of asg.data || []) {
        if (!a.track) continue;
        const res = computeTrackProgress(a.track.modules, {
          videoProgress: vp.data || [], presentationProgress: pp.data || [], documentProgress: dp.data || [],
          lessonProgress: lp.data || [], quizAttempts: qa.data || [], homeworkSubmissions: hw.data || [],
          externalSubmissions: ext.data || [],
        });
        res.missing.forEach((m) => miss.push({ track: a.track.title, ...m }));
      }
      setMissing(miss);
      setLoading(false);
    })();
  }, [userId]);

  const today = new Date().toISOString().slice(0, 10);
  const expired = rows.filter((r) => r.expiry && r.expiry < today);

  return (
    <Sheet open={!!userId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{name || 'Staff member'}</SheetTitle>
          <SheetDescription>{email}</SheetDescription>
        </SheetHeader>
        {loading ? (
          <p className="text-muted-foreground mt-6">Loading...</p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{rows.length} completed</Badge>
              <Badge variant="outline">{missing.length} not completed</Badge>
              {expired.length > 0 && <Badge variant="destructive">{expired.length} expired</Badge>}
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => window.open(`/certificates/print?userIds=${userId}`, '_blank')}>
                <FileDown className="h-3 w-3 mr-1" /> Download PDF Batch
              </Button>
            </div>

            <section>
              <h3 className="font-semibold mb-2">Completed certificates</h3>
              {rows.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
                <ul className="divide-y rounded-md border">
                  {rows.map((r) => (
                    <li key={r.kind + r.id} className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.kind}
                          {r.date ? ` • ${format(new Date(r.date), 'MMM d, yyyy')}` : ''}
                          {r.hours ? ` • ${Number(r.hours).toFixed(1)}h` : ''}
                          {r.expiry ? ` • expires ${format(new Date(r.expiry), 'MMM d, yyyy')}` : ''}
                        </p>
                      </div>
                      {r.expiry && r.expiry < today && <Badge variant="destructive">Expired</Badge>}
                      {r.link && (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={r.link} target="_blank"><Award className="h-3 w-3 mr-1" />View</Link>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="font-semibold mb-2">Not completed yet</h3>
              {missing.length === 0 ? <p className="text-sm text-muted-foreground">All assigned training is complete.</p> : (
                <ul className="divide-y rounded-md border">
                  {missing.map((m, i) => (
                    <li key={i} className="p-3">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.type} • {m.track} › {m.module}
                        {m.pendingReview ? ' • submitted, awaiting admin approval' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
