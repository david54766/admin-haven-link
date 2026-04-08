import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Link, X, FileVideo, Loader2 } from 'lucide-react';

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-ms-wmv', // .wmv
];
const ALLOWED_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv'];

interface VideoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function VideoUploader({ value, onChange, disabled }: VideoUploaderProps) {
  const [sourceType, setSourceType] = useState<'link' | 'upload'>(
    value && !value.includes('supabase.co/storage') ? 'link' : 'upload'
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: `Please select a valid video file (${ALLOWED_EXTENSIONS.join(', ')})`,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File Too Large',
        description: 'Video files must be smaller than 30MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      setUploadedFileName(file.name);
      setUploadProgress(100);

      toast({
        title: 'Video Uploaded',
        description: 'Your video has been uploaded successfully.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload video. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveUpload = () => {
    onChange('');
    setUploadedFileName(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Video Source</Label>
        <RadioGroup
          value={sourceType}
          onValueChange={(v) => {
            setSourceType(v as 'link' | 'upload');
            if (v !== sourceType) {
              onChange('');
              setUploadedFileName(null);
            }
          }}
          className="flex gap-4 mt-2"
          disabled={disabled}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="link" id="source-link" />
            <Label htmlFor="source-link" className="flex items-center gap-1 cursor-pointer">
              <Link className="h-4 w-4" />
              External Link
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="upload" id="source-upload" />
            <Label htmlFor="source-upload" className="flex items-center gap-1 cursor-pointer">
              <Upload className="h-4 w-4" />
              Upload File
            </Label>
          </div>
        </RadioGroup>
      </div>

      {sourceType === 'link' ? (
        <div>
          <Label htmlFor="videoUrl">Video URL *</Label>
          <Input
            id="videoUrl"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Supports YouTube, Vimeo, or direct video URLs
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {value && uploadedFileName ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <FileVideo className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFileName}</p>
                <p className="text-xs text-muted-foreground">Uploaded successfully</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveUpload}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center
                  ${isUploading ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                  transition-colors cursor-pointer
                `}
                onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="space-y-3">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading video...</p>
                    <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">Click to upload video</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max {formatFileSize(MAX_FILE_SIZE)} • {ALLOWED_EXTENSIONS.join(', ')}
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_VIDEO_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || isUploading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
