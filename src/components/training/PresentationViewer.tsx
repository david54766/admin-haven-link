import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Presentation, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PresentationViewerProps {
  presentationId: string;
  title: string;
  fileUrl: string;
  fileName: string;
  triggerLabel?: string;
  isCompleted?: boolean;
  allowMarkComplete?: boolean;
  allowDownload?: boolean;
  onComplete?: () => void;
}

export function PresentationViewer({ 
  presentationId,
  title, 
  fileUrl, 
  fileName, 
  triggerLabel = 'View',
  isCompleted = false,
  allowMarkComplete = true,
  allowDownload = true,
  onComplete
}: PresentationViewerProps) {
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
        .from('presentation_progress')
        .upsert({
          user_id: user.id,
          presentation_id: presentationId,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,presentation_id',
        });
    } catch (error) {
      console.error('Error marking presentation as viewed:', error);
    }
  };

  const markAsComplete = async () => {
    if (!user || hasMarkedComplete) return;

    try {
      await supabase
        .from('presentation_progress')
        .upsert({
          user_id: user.id,
          presentation_id: presentationId,
          viewed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,presentation_id',
        });

      setHasMarkedComplete(true);
      toast({ title: 'Presentation completed!' });
      onComplete?.();
    } catch (error) {
      console.error('Error marking presentation as complete:', error);
    }
  };

  const handleDownload = () => {
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

  // Microsoft Office Online viewer URL for PowerPoint files
  const getViewerUrl = () => {
    const encodedUrl = encodeURIComponent(fileUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  const isPowerPoint = fileName.toLowerCase().match(/\.(ppt|pptx|odp)$/);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant={hasMarkedComplete ? "outline" : "default"}>
          {hasMarkedComplete && <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
          <Presentation className="mr-2 h-4 w-4" />
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
              {allowDownload && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted flex flex-col">
          {isPowerPoint ? (
            <iframe
              src={getViewerUrl()}
              title={title}
              className="w-full h-full border-0"
              style={{ minHeight: '100%' }}
              allowFullScreen
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <Alert className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This file format cannot be previewed in the browser. Please download the file to view it.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
