import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Default hours credited for each approved outside (external) training. */
export const EXTERNAL_TRAINING_HOURS = 2;
/** Default hours for an uploaded certificate with no hours entered. */
export const UPLOADED_CERTIFICATE_DEFAULT_HOURS = 2;

export const HOURS_SETTINGS_KEY = 'training_hours_defaults';

export interface HoursSettings {
  externalTrainingHours: number;
  uploadedCertificateDefaultHours: number;
}

export const DEFAULT_HOURS_SETTINGS: HoursSettings = {
  externalTrainingHours: EXTERNAL_TRAINING_HOURS,
  uploadedCertificateDefaultHours: UPLOADED_CERTIFICATE_DEFAULT_HOURS,
};

const valid = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function parseHoursSettings(value: any): HoursSettings {
  return {
    externalTrainingHours: valid(value?.external_training_hours, EXTERNAL_TRAINING_HOURS),
    uploadedCertificateDefaultHours: valid(value?.uploaded_certificate_default_hours, UPLOADED_CERTIFICATE_DEFAULT_HOURS),
  };
}

/** Uploaded certificates use their entered hours, or the organization's default when none were entered. */
export function uploadedCertificateHours(
  hours: number | string | null | undefined,
  defaultHours: number = UPLOADED_CERTIFICATE_DEFAULT_HOURS,
): number {
  const n = Number(hours);
  return hours !== null && hours !== undefined && hours !== '' && Number.isFinite(n) && n > 0 ? n : defaultHours;
}

/** Loads the current organization's hours settings (falls back to defaults). */
export function useHoursSettings(): HoursSettings & { loaded: boolean } {
  const [s, setS] = useState<HoursSettings>(DEFAULT_HOURS_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', HOURS_SETTINGS_KEY).maybeSingle()
      .then(({ data }) => { setS(parseHoursSettings(data?.value)); setLoaded(true); });
  }, []);
  return { ...s, loaded };
}
