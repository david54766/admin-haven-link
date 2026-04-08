import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ComplianceConfig {
  default_required_hours: number;
  tracking_period: 'calendar_year' | 'anniversary_year' | 'fiscal_year';
  fiscal_year_start_month: number; // 1-12
  fiscal_year_start_day: number;   // 1-31
  thresholds: {
    green_min: number;
    yellow_min: number;
  };
}

const DEFAULT_CONFIG: ComplianceConfig = {
  default_required_hours: 20,
  tracking_period: 'calendar_year',
  fiscal_year_start_month: 7,
  fiscal_year_start_day: 1,
  thresholds: {
    green_min: 80,
    yellow_min: 50,
  },
};

const SETTINGS_KEY = 'hours_compliance';

export function useComplianceSettings() {
  const [config, setConfig] = useState<ComplianceConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTINGS_KEY)
        .maybeSingle();

      if (!error && data?.value) {
        const val = data.value as Record<string, any>;
        setConfig({
          default_required_hours: val.default_required_hours ?? DEFAULT_CONFIG.default_required_hours,
          tracking_period: val.tracking_period ?? DEFAULT_CONFIG.tracking_period,
          fiscal_year_start_month: val.fiscal_year_start_month ?? DEFAULT_CONFIG.fiscal_year_start_month,
          fiscal_year_start_day: val.fiscal_year_start_day ?? DEFAULT_CONFIG.fiscal_year_start_day,
          thresholds: {
            green_min: val.thresholds?.green_min ?? DEFAULT_CONFIG.thresholds.green_min,
            yellow_min: val.thresholds?.yellow_min ?? DEFAULT_CONFIG.thresholds.yellow_min,
          },
        });
      }
    } catch (err) {
      console.error('Error fetching compliance settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (newConfig: ComplianceConfig) => {
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', SETTINGS_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: newConfig as any })
          .eq('key', SETTINGS_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: SETTINGS_KEY,
            value: newConfig as any,
            description: 'Hours compliance configuration: thresholds, default hours, tracking period',
          });
        if (error) throw error;
      }

      setConfig(newConfig);
      return { success: true };
    } catch (err: any) {
      console.error('Error saving compliance settings:', err);
      return { success: false, error: err.message };
    }
  };

  const getStatusForPercentage = (percentage: number): 'red' | 'yellow' | 'green' => {
    if (percentage >= config.thresholds.green_min) return 'green';
    if (percentage >= config.thresholds.yellow_min) return 'yellow';
    return 'red';
  };

  return { config, isLoading, updateConfig, getStatusForPercentage };
}
