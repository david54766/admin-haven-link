/** Course hours must be empty (not set) or a number greater than zero. */
export function courseHoursError(hours: number | null | undefined): string | null {
  if (hours === null || hours === undefined) return null;
  if (!Number.isFinite(hours) || hours <= 0) return 'Course hours must be greater than 0 (or left blank).';
  return null;
}
