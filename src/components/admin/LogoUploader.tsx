import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Image, Loader2 } from 'lucide-react';

interface LogoUploaderProps {
  currentLogoUrl: string | null;
  onLogoChange: (url: string | null) => void;
}

export function LogoUploader({ currentLogoUrl, onLogoChange }: LogoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PNG, JPG, SVG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Logo must be less than 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Delete existing logo if present
      if (currentLogoUrl) {
        const existingPath = currentLogoUrl.split('/branding/')[1];
        if (existingPath) {
          await supabase.storage.from('branding').remove([existingPath]);
        }
      }

      // Upload new logo with timestamp to avoid caching issues
      const ext = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(data.path);

      onLogoChange(publicUrl);
      toast({ title: 'Logo Updated', description: 'Your new logo has been uploaded.' });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload logo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentLogoUrl) return;
    
    setIsDeleting(true);

    try {
      const existingPath = currentLogoUrl.split('/branding/')[1];
      if (existingPath) {
        const { error } = await supabase.storage.from('branding').remove([existingPath]);
        if (error) throw error;
      }

      onLogoChange(null);
      toast({ title: 'Logo Removed', description: 'The logo has been removed.' });
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to remove logo.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        {/* Logo Preview */}
        <div className="flex-shrink-0">
          <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden">
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt="Business Logo"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Image className="h-8 w-8 mx-auto mb-1 opacity-50" />
                <span className="text-xs">No logo</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-3">
          <div>
            <Label>Business Logo</Label>
            <p className="text-sm text-muted-foreground">
              Upload your organization's logo. Recommended size: 200x200px or larger. Supports PNG, JPG, SVG, or WebP.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="logo-upload"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? 'Uploading...' : 'Upload Logo'}
            </Button>
            
            {currentLogoUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoveLogo}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
