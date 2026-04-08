import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ReflectionResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reflectionId: string;
  staffName: string;
  onSuccess: () => void;
}

export function ReflectionResponseDialog({
  open,
  onOpenChange,
  reflectionId,
  staffName,
  onSuccess,
}: ReflectionResponseDialogProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reflection_responses').insert({
        reflection_id: reflectionId,
        user_id: user.id,
        content: content.trim(),
      });

      if (error) throw error;

      toast.success('Response sent successfully');
      setContent('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error('Failed to send response');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Respond to Reflection</DialogTitle>
          <DialogDescription>
            Send feedback to {staffName} about their reflection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Write your response..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim() || isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Response'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
