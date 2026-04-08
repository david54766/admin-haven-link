import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ContentDefaults {
  allow_mark_complete: boolean;
  allow_download: boolean;
}

const FALLBACK_DEFAULTS: ContentDefaults = {
  allow_mark_complete: false,
  allow_download: false,
};

interface TrackDefaults {
  default_allow_mark_complete: boolean | null;
  default_allow_download: boolean | null;
}

/**
 * Fetches content defaults from system settings.
 * Returns the effective defaults for creating new content.
 */
export function useContentDefaults() {
  const [systemDefaults, setSystemDefaults] = useState<ContentDefaults>(FALLBACK_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSystemDefaults();
  }, []);

  const fetchSystemDefaults = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'content_defaults')
        .single();

      if (error) {
        console.error('Error fetching system defaults:', error);
        return;
      }

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const value = data.value as Record<string, unknown>;
        setSystemDefaults({
          allow_mark_complete: typeof value.allow_mark_complete === 'boolean' ? value.allow_mark_complete : false,
          allow_download: typeof value.allow_download === 'boolean' ? value.allow_download : false,
        });
      }
    } catch (error) {
      console.error('Error fetching system defaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get effective defaults for a specific track.
   * Track-level settings override system defaults when not null.
   */
  const getEffectiveDefaults = (trackDefaults?: TrackDefaults | null): ContentDefaults => {
    return {
      allow_mark_complete: trackDefaults?.default_allow_mark_complete ?? systemDefaults.allow_mark_complete,
      allow_download: trackDefaults?.default_allow_download ?? systemDefaults.allow_download,
    };
  };

  const updateSystemDefaults = async (newDefaults: ContentDefaults) => {
    try {
      const jsonValue: Json = {
        allow_mark_complete: newDefaults.allow_mark_complete,
        allow_download: newDefaults.allow_download,
      };

      const { error } = await supabase
        .from('system_settings')
        .update({ value: jsonValue })
        .eq('key', 'content_defaults');

      if (error) throw error;
      
      setSystemDefaults(newDefaults);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating system defaults:', error);
      return { success: false, error: errorMessage };
    }
  };

  return {
    systemDefaults,
    isLoading,
    getEffectiveDefaults,
    updateSystemDefaults,
    refetch: fetchSystemDefaults,
  };
}
