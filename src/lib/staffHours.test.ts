import { describe, it, expect } from 'vitest';
import { EXTERNAL_TRAINING_HOURS, uploadedCertificateHours, parseHoursSettings } from './staffHours';

describe('staff hours', () => {
  it('approved external trainings award 2 hours', () => {
    expect(EXTERNAL_TRAINING_HOURS).toBe(2);
  });
  it('uploaded certificate without hours counts 2 hours', () => {
    expect(uploadedCertificateHours(null)).toBe(2);
  });
  it('uploaded certificate keeps entered hours', () => {
    expect(uploadedCertificateHours(3)).toBe(3);
  });
  it('Sonya: 4 external trainings + CPR upload + 0.5 module = 10.5', () => {
    expect(4 * EXTERNAL_TRAINING_HOURS + uploadedCertificateHours(null) + 0.5).toBe(10.5);
  });
});

describe('admin-adjustable hours', () => {
  it('uses the organization default for certificates without hours', () => {
    expect(uploadedCertificateHours(null, 1.5)).toBe(1.5);
  });
  it('entered hours still win over the organization default', () => {
    expect(uploadedCertificateHours(3, 1.5)).toBe(3);
  });
  it('reads saved settings and falls back to 2 when unset', () => {
    expect(parseHoursSettings({ external_training_hours: 3, uploaded_certificate_default_hours: 1 }))
      .toEqual({ externalTrainingHours: 3, uploadedCertificateDefaultHours: 1 });
    expect(parseHoursSettings(null)).toEqual({ externalTrainingHours: 2, uploadedCertificateDefaultHours: 2 });
  });
});
