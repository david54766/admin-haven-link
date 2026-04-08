import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import easyfillLogo from '@/assets/easyfill-logo.png';

interface EasyFillViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export function EasyFillViewer({ open, onOpenChange, url, title }: EasyFillViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 overflow-hidden" style={{ backgroundColor: 'hsl(var(--background))' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src={easyfillLogo} alt="EasyFill.ai" className="h-6 w-6 object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{title}</p>
              <p className="text-xs text-muted-foreground">Secure Digital Form · EasyFill.ai</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Iframe */}
        <div className="flex-1 relative overflow-hidden" style={{ height: 'calc(95vh - 57px)' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading form...</p>
              </div>
            </div>
          )}
          <iframe
            src={url}
            title={title}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            allow="camera; microphone"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function isEasyFillUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'app.easyfill.ai' || parsed.hostname === 'easyfill.ai' || parsed.hostname.endsWith('.easyfill.ai');
  } catch {
    return false;
  }
}
