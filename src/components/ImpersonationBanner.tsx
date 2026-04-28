import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export function ImpersonationBanner() {
  const { user, isPlatformAdmin, actingTenantId, actingTenantName, refreshProfile } = useAuth();
  const navigate = useNavigate();

  if (!isPlatformAdmin || !actingTenantId || !user) return null;

  const handleExit = async () => {
    try {
      await supabase.from('platform_admin_sessions').delete().eq('user_id', user.id);
      await supabase.from('platform_admin_audit').insert({
        user_id: user.id,
        tenant_id: actingTenantId,
        action: 'exit',
      });
      await refreshProfile();
      toast({ title: 'Exited tenant', description: 'Returned to platform admin.' });
      navigate('/platform');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-amber-500 text-amber-950 border-b border-amber-600">
      <div className="container flex h-10 items-center justify-between gap-3 px-4 text-sm font-medium">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Acting as: <strong>{actingTenantName || 'tenant'}</strong>
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 bg-white/90 hover:bg-white text-amber-950 border-amber-700"
          onClick={handleExit}
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Exit Tenant
        </Button>
      </div>
    </div>
  );
}
