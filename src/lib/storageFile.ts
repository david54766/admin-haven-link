import { supabase } from '@/integrations/supabase/client';

/** Splits a stored file URL into bucket + path, or null if it isn't one of our storage URLs. */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

/** Downloads a stored file through the signed-in client and returns a local blob URL. */
export async function loadStorageFileAsBlobUrl(url: string): Promise<string> {
  const parsed = parseStorageUrl(url);
  if (!parsed) return url; // external link, use as-is
  const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path);
  if (error || !data) throw error || new Error('File not found');
  return URL.createObjectURL(data);
}
