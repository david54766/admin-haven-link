import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { HOURS_SETTINGS_KEY, parseHoursSettings } from '@/lib/staffHours';

export function TrainingHoursSettings() {
  const { toast } = useToast();
  const [external, setExternal] = useState('2');
  const [uploaded, setUploaded] = useState('2');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', HOURS_SETTINGS_KEY).maybeSingle().then(({ data }) => {
      const s = parseHoursSettings(data?.value);
      setExternal(String(s.externalTrainingHours));
      setUploaded(String(s.uploadedCertificateDefaultHours));
    });
  }, []);

  const save = async () => {
    const e = Number(external), u = Number(uploaded);
    if (!Number.isFinite(e) || e <= 0 || !Number.isFinite(u) || u <= 0) {
      toast({ title: 'Enter hours greater than 0', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('system_settings').upsert(
      { key: HOURS_SETTINGS_KEY, value: { external_training_hours: e, uploaded_certificate_default_hours: u } } as any,
      { onConflict: 'tenant_id,key' },
    );
    setSaving(false);
    toast(error ? { title: 'Failed to save', description: error.message, variant: 'destructive' } : { title: 'Training hours saved' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Hours Credit</CardTitle>
        <CardDescription>Hours added to staff totals for outside trainings and uploaded certificates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ext-hours">Hours per approved outside training</Label>
            <Input id="ext-hours" type="number" min="0.25" step="0.25" value={external} onChange={(e) => setExternal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="up-hours">Hours for an uploaded certificate with no hours entered</Label>
            <Input id="up-hours" type="number" min="0.25" step="0.25" value={uploaded} onChange={(e) => setUploaded(e.target.value)} />
            <p className="text-xs text-muted-foreground">If hours are entered on the certificate, that number is used instead.</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Hours Settings'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
