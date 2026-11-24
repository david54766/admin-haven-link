import { supabase } from '@/integrations/supabase/client';

export type UploadKind = 'document' | 'certificate' | 'external_training' | 'homework' | 'important_document';

/** Fire-and-forget: emails the tenant's admins and a confirmation to the uploader. Never blocks the upload. */
export function notifyUpload(kind: UploadKind, title: string, fileName?: string | null) {
  supabase.functions
    .invoke('send-upload-notification', { body: { kind, title, fileName: fileName ?? null } })
    .catch((e) => console.error('Upload notification failed', e));
}
