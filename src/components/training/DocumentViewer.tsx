import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DocumentViewerProps {
  documentId: string;
  title: string;
  fileUrl: string;
  fileName: string;
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  isCompleted?: boolean;
  allowMarkComplete?: boolean;
  allowDownload?: boolean;
  onComplete?: () => void;
}

export function DocumentViewer({ 
  documentId,
  title, 
  fileUrl, 
  fileName, 
  triggerLabel = 'View', 
  triggerIcon,
  isCompleted = false,
  allowMarkComplete = true,
  allowDownload = true,
  onComplete
}: DocumentViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(isCompleted);
  const { user } = useAuth();
  const { toast } = useToast();
  const viewStartTime = useRef<number | null>(null);
  const completionTimeout = useRef<NodeJS.Timeout | null>(null);

  // Mark as viewed when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      viewStartTime.current = Date.now();
      markAsViewed();
      
      // Auto-complete after 30 seconds of viewing (always enabled - this represents actually consuming the content)
      completionTimeout.current = setTimeout(() => {
        if (!hasMarkedComplete) {
          markAsComplete();
        }
      }, 30000);
    }

    return () => {
      if (completionTimeout.current) {
        clearTimeout(completionTimeout.current);
      }
    };
  }, [isOpen, user]);

  const markAsViewed = async () => {
    if (!user) return;

    try {
      await supabase
        .from('document_progress')
        .upsert({
          user_id: user.id,
          document_id: documentId,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,document_id',
        });
    } catch (error) {
      console.error('Error marking document as viewed:', error);
    }
  };

  const markAsComplete = async () => {
    if (!user || hasMarkedComplete) return;

    try {
      await supabase
        .from('document_progress')
        .upsert({
          user_id: user.id,
          document_id: documentId,
          viewed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,document_id',
        });

      setHasMarkedComplete(true);
      toast({ title: 'Document completed!' });
      onComplete?.();
    } catch (error) {
      console.error('Error marking document as complete:', error);
    }
  };

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  const handleMarkComplete = () => {
    markAsComplete();
  };

  const handleClose = (open: boolean) => {
    if (!open && viewStartTime.current) {
      const viewDuration = Date.now() - viewStartTime.current;
      // If viewed for at least 10 seconds but not yet completed, mark complete on close
      if (viewDuration >= 10000 && !hasMarkedComplete) {
        markAsComplete();
      }
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant={hasMarkedComplete ? "outline" : "default"}>
          {hasMarkedComplete && <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
          {triggerIcon || <FileText className="mr-2 h-4 w-4" />}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="pr-8">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              {allowMarkComplete && !hasMarkedComplete && (
                <Button variant="outline" size="sm" onClick={handleMarkComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Tab
              </Button>
              {allowDownload && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted">
          <iframe
            src={fileUrl}
            title={title}
            className="w-full h-full border-0"
            style={{ minHeight: '100%' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
