import { describe, it, expect } from 'vitest';
import { courseHoursError } from './courseHours';

describe('courseHoursError', () => {
  it('rejects negative hours like -23', () => expect(courseHoursError(-23)).not.toBeNull());
  it('rejects zero hours', () => expect(courseHoursError(0)).not.toBeNull());
  it('accepts 1.5 hours', () => expect(courseHoursError(1.5)).toBeNull());
  it('accepts blank', () => expect(courseHoursError(null)).toBeNull());
});
