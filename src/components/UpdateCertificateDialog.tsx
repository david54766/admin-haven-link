import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Certificate {
  id: string;
  user_id: string;
  title: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  file_url: string | null;
  file_name: string | null;
  hours: number | null;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: Certificate | null;
  onUpdated: () => void;
}

export function UpdateCertificateDialog({ open, onOpenChange, certificate, onUpdated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [org, setOrg] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (certificate) {
      setTitle(certificate.title || '');
      setOrg(certificate.issuing_organization || '');
      setIssueDate(certificate.issue_date || '');
      setExpiryDate(certificate.expiry_date || '');
      setCertNumber(certificate.certificate_number || '');
      setHours(certificate.hours?.toString() || '');
      setNotes(certificate.notes || '');
      setFile(null);
    }
  }, [certificate]);

  const handleSubmit = async () => {
    if (!certificate || !user) return;
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // 1. Archive current state to history
      const { error: histErr } = await supabase.from('staff_certificate_history').insert({
        certificate_id: certificate.id,
        user_id: certificate.user_id,
        title: certificate.title,
        issuing_organization: certificate.issuing_organization,
        issue_date: certificate.issue_date,
        expiry_date: certificate.expiry_date,
        certificate_number: certificate.certificate_number,
        file_url: certificate.file_url,
        file_name: certificate.file_name,
        hours: certificate.hours,
        notes: certificate.notes,
        archived_by: user.id,
      });
      if (histErr) throw histErr;

      // 2. Optionally upload new file
      let newFileUrl = certificate.file_url;
      let newFileName = certificate.file_name;
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${certificate.user_id}/${certificate.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('certificates').upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('certificates').getPublicUrl(path);
        newFileUrl = pub.publicUrl;
        newFileName = file.name;
      }

      // 3. Update certificate
      const { error: updErr } = await supabase.from('staff_certificates').update({
        title: title.trim(),
        issuing_organization: org.trim() || null,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        certificate_number: certNumber.trim() || null,
        hours: hours ? parseFloat(hours) : null,
        notes: notes.trim() || null,
        file_url: newFileUrl,
        file_name: newFileName,
      }).eq('id', certificate.id);
      if (updErr) throw updErr;

      toast({ title: 'Certificate updated', description: 'Previous version saved to history.' });
      onUpdated();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to update', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Certificate</DialogTitle>
          <DialogDescription>The current certificate will be archived as a previous version for reference.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Issuing Organization</Label>
            <Input value={org} onChange={(e) => setOrg(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Certificate Number</Label>
              <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} />
            </div>
            <div>
              <Label>Training Hours</Label>
              <Input type="number" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Replace File (optional)</Label>
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {!file && certificate?.file_name && (
              <p className="text-xs text-muted-foreground mt-1">Current: {certificate.file_name} (will be kept if no new file)</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Update Certificate'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
