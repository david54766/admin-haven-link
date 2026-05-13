import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryRow {
  id: string;
  title: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  file_url: string | null;
  file_name: string | null;
  hours: number | null;
  notes: string | null;
  archived_at: string;
}

const getStoragePath = (fileUrl: string) => {
  if (!fileUrl.startsWith('http')) return fileUrl;
  const marker = '/storage/v1/object/public/certificates/';
  const i = fileUrl.indexOf(marker);
  if (i === -1) return fileUrl;
  return decodeURIComponent(fileUrl.slice(i + marker.length).split('?')[0]);
};

async function openHistoryFile(fileUrl: string) {
  try {
    const path = getStoragePath(fileUrl);
    const { data, error } = await supabase.storage.from('certificates').createSignedUrl(path, 60 * 10);
    if (error) throw error;
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.error('Failed to open file', e);
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }
}

export function PreviousCertificateAccordion({ certificateId }: { certificateId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      const { data } = await supabase
        .from('staff_certificate_history')
        .select('*')
        .eq('certificate_id', certificateId)
        .order('archived_at', { ascending: false });
      setRows((data || []) as HistoryRow[]);
      setLoaded(true);
    })();
  }, [open, loaded, certificateId]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2 border-t pt-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
          Previous certificate{rows.length > 1 ? 's' : ''}
          {loaded && <span className="ml-1">({rows.length})</span>}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {loaded && rows.length === 0 && (
          <p className="text-xs text-muted-foreground px-2">No previous versions.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                {r.issuing_organization && (
                  <div className="text-xs text-muted-foreground">{r.issuing_organization}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1 space-x-2">
                  {r.issue_date && <span>Issued {format(new Date(r.issue_date), 'MMM d, yyyy')}</span>}
                  {r.expiry_date && <span>· Expired {format(new Date(r.expiry_date), 'MMM d, yyyy')}</span>}
                  {r.hours != null && <span>· {r.hours}h</span>}
                </div>
                {r.certificate_number && (
                  <div className="text-xs text-muted-foreground">Cert #: {r.certificate_number}</div>
                )}
                {r.notes && <div className="text-xs mt-1">{r.notes}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">Archived {format(new Date(r.archived_at), 'MMM d, yyyy h:mm a')}</div>
              </div>
              {r.file_url && (
                <Button variant="outline" size="sm" onClick={() => openHistoryFile(r.file_url!)}>
                  <FileText className="h-3 w-3 mr-1" />
                  View
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
