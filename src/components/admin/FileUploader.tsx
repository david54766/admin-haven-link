import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, X, Loader2 } from 'lucide-react';

interface FileUploaderProps {
  value: string;
  fileName: string;
  onChange: (url: string, fileName: string) => void;
  accept: string;
  label: string;
  bucket?: string;
}

export function FileUploader({ 
  value, 
  fileName, 
  onChange, 
  accept, 
  label,
  bucket = 'documents' 
}: FileUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl, file.name);
      toast({ title: 'File uploaded successfully' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Upload Failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    onChange('', '');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {value ? (
        <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/50">
          <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate flex-1">{fileName || 'Uploaded file'}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={isUploading}
            className="cursor-pointer"
          />
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}
    </div>
  );
}
