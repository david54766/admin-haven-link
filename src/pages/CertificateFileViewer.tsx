import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';

interface CertificateFile {
  id: string;
  title: string;
  file_url: string | null;
  file_name: string | null;
}

const getStoragePath = (fileUrl: string) => {
  if (!fileUrl.startsWith('http')) return fileUrl;

  const marker = '/storage/v1/object/public/certificates/';
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex === -1) return fileUrl;

  return decodeURIComponent(fileUrl.slice(markerIndex + marker.length).split('?')[0]);
};

export default function CertificateFileViewer() {
  const { certificateId } = useParams();
  const [certificate, setCertificate] = useState<CertificateFile | null>(null);
  const [fileObjectUrl, setFileObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let createdObjectUrl: string | null = null;

    const loadCertificate = async () => {
      if (!certificateId) return;

      try {
        const { data, error } = await supabase
          .from('staff_certificates')
          .select('id, title, file_url, file_name')
          .eq('id', certificateId)
          .single();

        if (error) throw error;
        if (isMounted) setCertificate(data as CertificateFile);

        if (data?.file_url) {
          const filePath = getStoragePath(data.file_url);
          const { data: fileBlob, error: downloadError } = await supabase.storage
            .from('certificates')
            .download(filePath);

          if (downloadError) throw downloadError;
          createdObjectUrl = URL.createObjectURL(fileBlob);
          if (isMounted) setFileObjectUrl(createdObjectUrl);
        }
      } catch (error) {
        console.error('Error loading certificate file:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCertificate();

    return () => {
      isMounted = false;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [certificateId]);

  const isImage = useMemo(() => {
    const name = certificate?.file_name || certificate?.file_url || '';
    return /\.(png|jpe?g|gif|webp)$/i.test(name);
  }, [certificate]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild>
              <button type="button" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{certificate?.title || 'Certificate'}</h1>
              {certificate?.file_name && <p className="text-sm text-muted-foreground truncate">{certificate.file_name}</p>}
            </div>
          </div>
          {fileObjectUrl && (
            <Button asChild>
              <a href={fileObjectUrl} download={certificate?.file_name || undefined} rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          )}
        </div>

        <Card className="border-2">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !fileObjectUrl ? (
              <div className="py-12 text-center text-muted-foreground">Certificate file not found.</div>
            ) : isImage ? (
              <div className="flex min-h-[60vh] items-center justify-center bg-muted/30 p-4">
                <img src={fileObjectUrl} alt={certificate?.title || 'Certificate'} className="max-h-[75vh] max-w-full rounded-md object-contain" />
              </div>
            ) : (
              <iframe title={certificate?.title || 'Certificate file'} src={fileObjectUrl} className="h-[75vh] w-full rounded-md" />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}