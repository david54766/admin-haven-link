import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Award, Download } from 'lucide-react';
import { CertificateRenderer } from '@/components/CertificateRenderer';
import type { TextField } from '@/components/admin/CertificateTemplateEditor';

interface TrackCertificateData {
  id: string;
  staff_name: string;
  center_name: string;
  instructor_name: string;
  track_title: string;
  hours_earned: number;
  issued_at: string;
  certificate_number: string;
  expiry_date: string | null;
  track_id: string;
}

export default function TrackCertificate() {
  const { certificateId } = useParams();
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<TrackCertificateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<{ background_image_url: string | null; text_fields: TextField[] } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (certificateId) fetchCertificate();
  }, [certificateId]);

  const fetchCertificate = async () => {
    try {
      // Try track_certificates first
      let { data, error } = await supabase
        .from('track_certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

      if (error) {
        // Try module_certificates
        const moduleRes = await supabase
          .from('module_certificates')
          .select('*')
          .eq('id', certificateId)
          .single();
        if (moduleRes.error) throw moduleRes.error;
        data = moduleRes.data;
      }

      setCertificate(data as TrackCertificateData);

      // Fetch template if linked
      if (data?.track_id) {
        const { data: trackData } = await supabase
          .from('training_tracks')
          .select('certificate_template_id')
          .eq('id', data.track_id)
          .single();

        if (trackData?.certificate_template_id) {
          const { data: tmpl } = await supabase
            .from('certificate_templates')
            .select('background_image_url, text_fields')
            .eq('id', trackData.certificate_template_id)
            .single();
          if (tmpl) {
            setTemplate({
              background_image_url: tmpl.background_image_url,
              text_fields: (tmpl.text_fields as any) || [],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `certificate-${certificate?.certificate_number || 'download'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback: just print
      window.print();
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <p className="text-muted-foreground">Loading certificate...</p>
      </Layout>
    );
  }

  if (!certificate) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Certificate not found</p>
            <Button asChild className="mt-4">
              <Link to="/training">Back to Training</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const expiryDate = certificate.expiry_date
    ? new Date(certificate.expiry_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined;

  const certData = {
    staff_name: certificate.staff_name,
    track_title: certificate.track_title,
    center_name: certificate.center_name,
    instructor_name: certificate.instructor_name,
    hours_earned: certificate.hours_earned,
    issued_date: issuedDate,
    expiry_date: expiryDate,
    certificate_number: certificate.certificate_number,
  };

  // Default text fields if no template — positioned for the default certificate background
  const defaultFields: TextField[] = [
    { id: '1', label: 'Title', content_key: 'custom_text', x: 20, y: 10, width: 65, height: 10, fontSize: 32, fontFamily: 'Georgia, serif', color: '#1a365d', textAlign: 'center', fontWeight: 'bold' },
    { id: '2', label: 'Subtitle', content_key: 'custom_text', x: 20, y: 20, width: 65, height: 5, fontSize: 13, fontFamily: 'Georgia, serif', color: '#6b7280', textAlign: 'center', fontWeight: 'normal' },
    { id: '3', label: 'Staff Name', content_key: 'staff_name', x: 20, y: 30, width: 65, height: 12, fontSize: 38, fontFamily: 'Georgia, serif', color: '#1a202c', textAlign: 'center', fontWeight: 'bold' },
    { id: '4', label: 'Center', content_key: 'center_name', x: 20, y: 43, width: 65, height: 6, fontSize: 16, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal' },
    { id: '5', label: 'Track', content_key: 'track_title', x: 20, y: 52, width: 65, height: 8, fontSize: 22, fontFamily: 'Georgia, serif', color: '#2b6cb0', textAlign: 'center', fontWeight: 'bold' },
    { id: '6', label: 'Hours', content_key: 'hours_earned', x: 20, y: 62, width: 65, height: 6, fontSize: 15, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal' },
    { id: '7', label: 'Date', content_key: 'issued_date', x: 20, y: 74, width: 30, height: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal' },
    { id: '8', label: 'Instructor', content_key: 'instructor_name', x: 55, y: 74, width: 30, height: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal' },
    { id: '9', label: 'Cert #', content_key: 'certificate_number', x: 20, y: 88, width: 65, height: 5, fontSize: 10, fontFamily: 'Georgia, serif', color: '#9ca3af', textAlign: 'center', fontWeight: 'normal' },
  ];

  const textFields = template?.text_fields?.length ? template.text_fields : defaultFields;
  const bgUrl = template?.background_image_url || '/images/default-certificate-bg.png';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/training">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Certificate of Completion</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <div ref={printRef} className="w-full max-w-3xl">
            <CertificateRenderer
              textFields={textFields}
              backgroundImageUrl={bgUrl}
              data={certData}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
