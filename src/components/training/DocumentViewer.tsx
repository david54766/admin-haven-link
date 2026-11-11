import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { loadStorageFileAsBlobUrl } from '@/lib/storageFile';

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
  const [fileSrc, setFileSrc] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // Load the file securely when the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let created: string | null = null;
    setLoadState('loading');
    loadStorageFileAsBlobUrl(fileUrl)
      .then((src) => {
        if (cancelled) return;
        if (src.startsWith('blob:')) created = src;
        setFileSrc(src);
        setLoadState('ready');
      })
      .catch((e) => {
        console.error('Error loading document:', e);
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
      setFileSrc(null);
      setLoadState('idle');
    };
  }, [isOpen, fileUrl]);

  // Only count viewing time once the file actually opened
  useEffect(() => {
    if (isOpen && user && loadState === 'ready') {
      viewStartTime.current = Date.now();
      markAsViewed();

      // Auto-complete after 30 seconds of viewing
      completionTimeout.current = setTimeout(() => {
        if (!hasMarkedComplete) {
          markAsComplete();
        }
      }, 30000);
    }
    if (!isOpen) viewStartTime.current = null;

    return () => {
      if (completionTimeout.current) {
        clearTimeout(completionTimeout.current);
      }
    };
  }, [isOpen, user, loadState]);

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
    if (!user || hasMarkedComplete || loadState !== 'ready') return;

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
    if (!fileSrc) return;
    const a = document.createElement('a');
    a.href = fileSrc;
    a.download = fileName || title;
    a.click();
  };

  const handleOpenInNewTab = () => {
    if (fileSrc) window.open(fileSrc, '_blank');
  };

  const handleMarkComplete = () => {
    markAsComplete();
  };

  const handleClose = (open: boolean) => {
    if (!open && viewStartTime.current && loadState === 'ready') {
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
              {allowMarkComplete && !hasMarkedComplete && loadState === 'ready' && (
                <Button variant="outline" size="sm" onClick={handleMarkComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleOpenInNewTab} disabled={!fileSrc}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Tab
              </Button>
              {allowDownload && (
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={!fileSrc}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted">
          {loadState === 'ready' && fileSrc ? (
            <iframe
              src={fileSrc}
              title={title}
              className="w-full h-full border-0"
              style={{ minHeight: '100%' }}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
              {loadState === 'error'
                ? 'This document could not be opened. Please let your administrator know so they can re-upload it.'
                : 'Loading document…'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
