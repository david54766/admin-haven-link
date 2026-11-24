/** Hours credited for each approved outside (external) training. */
export const EXTERNAL_TRAINING_HOURS = 2;

/** Uploaded outside certificates use their entered hours, or 2 hours when none were entered. */
export function uploadedCertificateHours(hours: number | string | null | undefined): number {
  const n = Number(hours);
  return Number.isFinite(n) && n > 0 ? n : EXTERNAL_TRAINING_HOURS;
}
