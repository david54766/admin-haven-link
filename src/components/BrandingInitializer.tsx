import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Apply branding colors to CSS variables on app initialization
export function BrandingInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initBranding = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'branding')
          .maybeSingle();

        if (data?.value) {
          const root = document.documentElement;
          const branding = data.value as any;
          
          if (branding.primary_color) {
            root.style.setProperty('--primary', branding.primary_color);
            root.style.setProperty('--primary-foreground', '0 0% 100%');
          }
          
          if (branding.accent_color) {
            root.style.setProperty('--accent', branding.accent_color);
            root.style.setProperty('--accent-foreground', '0 0% 100%');
          }
        }
      } catch (error) {
        console.error('Error initializing branding:', error);
      }
    };

    initBranding();
  }, []);

  return <>{children}</>;
}
