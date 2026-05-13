import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const ALL_WINDOWS = [7, 15, 30, 60, 90];

export function CertificateRemindersSettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(true);
  const [windows, setWindows] = useState<number[]>(ALL_WINDOWS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'certificate_expiry_reminders')
        .maybeSingle();
      const v: any = data?.value || {};
      setEnabled(v.enabled !== false);
      setWindows(Array.isArray(v.windows) && v.windows.length ? v.windows : ALL_WINDOWS);
      setLoading(false);
    })();
  }, []);

  const toggleWindow = (n: number) => {
    setWindows((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'certificate_expiry_reminders', value: { enabled, windows } }, { onConflict: 'tenant_id,key' });
      if (error) throw error;
      toast({ title: 'Reminder settings saved' });
    } catch (e: any) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificate Expiry Reminders</CardTitle>
        <CardDescription>
          Automated emails to staff and admins before a certificate expires. Choose which reminders to send so there's enough time to upload a renewed certificate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base">Enable reminders</Label>
            <p className="text-sm text-muted-foreground">When off, no automated reminders are sent.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-3">
          <Label>Send a reminder this many days before expiry</Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ALL_WINDOWS.map((n) => (
              <label key={n} className={`flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors ${windows.includes(n) ? 'border-primary bg-primary/5' : ''} ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <Checkbox checked={windows.includes(n)} onCheckedChange={() => toggleWindow(n)} />
                <span className="font-medium">{n} days</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Reminders run automatically each morning. Each certificate triggers at most one email per selected window.</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Reminder Settings'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
