import { describe, it, expect } from 'vitest';
import { parseStorageUrl } from './storageFile';

describe('parseStorageUrl', () => {
  it('reads bucket and path from a private-bucket public URL', () => {
    expect(parseStorageUrl('https://x.supabase.co/storage/v1/object/public/documents/t1/cacfp.pdf'))
      .toEqual({ bucket: 'documents', path: 't1/cacfp.pdf' });
  });
  it('leaves external links alone', () => {
    expect(parseStorageUrl('https://youtube.com/watch?v=1')).toBeNull();
  });
});
