import { describe, it, expect } from 'vitest';
import { EXTERNAL_TRAINING_HOURS, uploadedCertificateHours } from './staffHours';

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
