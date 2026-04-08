import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Clock, ExternalLink, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ModuleExternalTraining, ExternalTrainingSubmission } from '@/types/database';

interface ExternalTrainingItemProps {
  training: ModuleExternalTraining;
  submissions: ExternalTrainingSubmission[];
  onUpdate: () => void;
}

export function ExternalTrainingItem({ training, submissions, onUpdate }: ExternalTrainingItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null;
  const isApproved = submissions.some(s => s.status === 'approved');
  const isPending = latestSubmission?.status === 'submitted';
  const isRejected = latestSubmission?.status === 'rejected';

  const getStatus = () => {
    if (isApproved) return 'approved';
    if (isPending) return 'pending';
    if (isRejected) return 'rejected';
    if (!training.requires_certificate && submissions.length > 0) return 'completed';
    return 'not_started';
  };

  const status = getStatus();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${training.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from('external_training_submissions')
        .insert({
          external_training_id: training.id,
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          status: 'submitted',
        });

      if (error) throw error;

      toast({ title: 'Certificate uploaded successfully' });
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelfConfirm = async () => {
    if (!user) return;
    setIsConfirming(true);
    try {
      const { error } = await supabase
        .from('external_training_submissions')
        .insert({
          external_training_id: training.id,
          user_id: user.id,
          status: 'approved',
        });

      if (error) throw error;

      toast({ title: 'Training marked as complete' });
      onUpdate();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {status === 'approved' || status === 'completed' ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
          ) : status === 'pending' ? (
            <Clock className="h-5 w-5 shrink-0 text-yellow-500" />
          ) : (
            <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{training.title}</p>
            {training.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{training.description}</p>
            )}
            {status === 'pending' && (
              <Badge variant="secondary" className="text-xs mt-1">Pending Review</Badge>
            )}
            {status === 'rejected' && (
              <div>
                <Badge variant="destructive" className="text-xs mt-1">Rejected</Badge>
                {latestSubmission?.review_notes && (
                  <p className="text-xs text-muted-foreground mt-1">{latestSubmission.review_notes}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0 self-end sm:self-auto">
          <Button size="sm" variant="outline" asChild>
            <a href={training.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              Open Training
            </a>
          </Button>

          {status !== 'approved' && status !== 'completed' && status !== 'pending' && (
            <>
              {training.requires_certificate ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Certificate'}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSelfConfirm}
                  disabled={isConfirming}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {isConfirming ? 'Confirming...' : 'Mark Complete'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}