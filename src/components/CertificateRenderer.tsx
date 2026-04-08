import { forwardRef } from 'react';
import type { TextField } from '@/components/admin/CertificateTemplateEditor';

interface CertificateData {
  staff_name: string;
  track_title: string;
  center_name: string;
  instructor_name: string;
  hours_earned: number;
  issued_date: string;
  expiry_date?: string;
  certificate_number: string;
  module_title?: string;
}

interface Props {
  textFields: TextField[];
  backgroundImageUrl?: string | null;
  data: CertificateData;
  className?: string;
}

export const CertificateRenderer = forwardRef<HTMLDivElement, Props>(
  ({ textFields, backgroundImageUrl, data, className = '' }, ref) => {
    const getContent = (key: string): string => {
      const map: Record<string, string> = {
        staff_name: data.staff_name,
        track_title: data.module_title || data.track_title,
        center_name: data.center_name,
        instructor_name: data.instructor_name,
        hours_earned: `${data.hours_earned} training hour${data.hours_earned !== 1 ? 's' : ''}`,
        issued_date: data.issued_date,
        expiry_date: data.expiry_date || 'N/A',
        certificate_number: data.certificate_number,
        custom_text: 'Certificate of Completion',
      };
      return map[key] || key;
    };

    return (
      <div
        ref={ref}
        className={`relative bg-white ${className}`}
        style={{ width: '100%', aspectRatio: '1.414' }}
      >
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt="Certificate background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!backgroundImageUrl && (
          <div className="absolute inset-0 border-4 border-primary/30 rounded-lg">
            <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-primary/40 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-primary/40 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-primary/40 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-primary/40 rounded-br-lg" />
          </div>
        )}
        {textFields.map((field) => (
          <div
            key={field.id}
            className="absolute overflow-hidden"
            style={{
              left: `${field.x}%`,
              top: `${field.y}%`,
              width: `${field.width}%`,
              height: `${field.height}%`,
              fontSize: `${field.fontSize}px`,
              fontFamily: field.fontFamily,
              color: field.color,
              textAlign: field.textAlign as any,
              fontWeight: field.fontWeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                field.textAlign === 'center'
                  ? 'center'
                  : field.textAlign === 'right'
                  ? 'flex-end'
                  : 'flex-start',
              lineHeight: 1.2,
            }}
          >
            {getContent(field.content_key)}
          </div>
        ))}
      </div>
    );
  }
);

CertificateRenderer.displayName = 'CertificateRenderer';
