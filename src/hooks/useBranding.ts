import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BrandingSettings {
  logo_url: string | null;
  business_name: string;
  primary_color: string;
  accent_color: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  logo_url: null,
  business_name: 'Classroom Panda Training Portal',
  primary_color: '280 85% 65%', // Default purple
  accent_color: '340 82% 62%', // Default pink
};

// Apply colors to CSS variables
const applyThemeColors = (branding: BrandingSettings) => {
  const root = document.documentElement;
  
  if (branding.primary_color) {
    root.style.setProperty('--primary', branding.primary_color);
    // Generate foreground color (white for dark backgrounds)
    root.style.setProperty('--primary-foreground', '0 0% 100%');
  }
  
  if (branding.accent_color) {
    root.style.setProperty('--accent', branding.accent_color);
    root.style.setProperty('--accent-foreground', '0 0% 100%');
  }
};

export function useBranding() {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'branding')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching branding:', error);
      }

      if (data?.value) {
        const fetchedBranding = {
          logo_url: (data.value as any).logo_url || null,
          business_name: (data.value as any).business_name || DEFAULT_BRANDING.business_name,
          primary_color: (data.value as any).primary_color || DEFAULT_BRANDING.primary_color,
          accent_color: (data.value as any).accent_color || DEFAULT_BRANDING.accent_color,
        };
        setBranding(fetchedBranding);
        applyThemeColors(fetchedBranding);
      }
    } catch (error) {
      console.error('Error in fetchBranding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // Apply colors whenever branding changes
  useEffect(() => {
    if (!isLoading) {
      applyThemeColors(branding);
    }
  }, [branding, isLoading]);

  const updateBranding = async (updates: Partial<BrandingSettings>) => {
    try {
      const newBranding = { ...branding, ...updates };
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'branding',
          value: newBranding,
          description: 'Branding settings including logo, business name, and colors',
        }, { onConflict: 'tenant_id,key' });

      if (error) throw error;

      setBranding(newBranding);
      applyThemeColors(newBranding);
      return { success: true };
    } catch (error: any) {
      console.error('Error updating branding:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    branding,
    isLoading,
    updateBranding,
    refetch: fetchBranding,
  };
}
