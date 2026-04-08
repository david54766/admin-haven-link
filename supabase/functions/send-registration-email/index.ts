import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Branding {
  business_name: string;
  logo_url: string | null;
  primary_color: string;
}

async function fetchBranding(client: any): Promise<Branding> {
  const defaults: Branding = { business_name: 'Training Portal', logo_url: null, primary_color: '280 85% 65%' };
  try {
    const { data } = await client.from('system_settings').select('value').eq('key', 'branding').maybeSingle();
    if (data?.value) {
      return {
        business_name: (data.value as any).business_name || defaults.business_name,
        logo_url: (data.value as any).logo_url || null,
        primary_color: (data.value as any).primary_color || defaults.primary_color,
      };
    }
  } catch (e) { console.error('Error fetching branding:', e); }
  return defaults;
}

function hslToHex(hslStr: string): string {
  const parts = hslStr.split(/\s+/);
  const h = parseFloat(parts[0]) || 0;
  const s = (parseFloat(parts[1]) || 0) / 100;
  const l = (parseFloat(parts[2]) || 0) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function wrapEmail(branding: Branding, body: string): string {
  const brandColor = hslToHex(branding.primary_color);
  const logoHtml = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="${branding.business_name}" style="max-height: 48px; margin-bottom: 10px;" />`
    : '';
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, ${brandColor}, ${brandColor}dd); padding: 30px 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
        ${logoHtml}
        <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">${branding.business_name}</h2>
      </div>
      <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        ${body}
      </div>
      <div style="text-align: center; padding: 20px 30px;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">&copy; ${new Date().getFullYear()} ${branding.business_name}. All rights reserved.</p>
        <p style="font-size: 11px; color: #9ca3af; margin: 5px 0 0;">This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantName, applicantEmail } = await req.json();

    if (!applicantEmail || !applicantName) {
      return new Response(JSON.stringify({ error: 'applicantName and applicantEmail are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const branding = await fetchBranding(adminClient);
    const brandColor = hslToHex(branding.primary_color);
    const loginUrl = 'https://msjoschildcare.com';

    const bodyHtml = `
      <h1 style="color: #333; margin-top: 0; font-size: 24px;">Application Received! 🎉</h1>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Hi <strong>${applicantName}</strong>,
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Thank you for applying to join <strong>${branding.business_name}</strong>! We've received your application and our team will review it shortly.
      </p>
      <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${brandColor};">
        <h3 style="margin-top: 0; color: #333; font-size: 16px;">What Happens Next?</h3>
        <ul style="margin: 10px 0 0; padding-left: 20px; color: #555; line-height: 1.8;">
          <li>Our team will review your application</li>
          <li>You'll receive a notification once approved</li>
          <li>After approval, you can log in and start your training</li>
        </ul>
      </div>
      ${loginUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}/login" style="display: inline-block; padding: 14px 32px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Visit Portal</a>
        </div>
      ` : ''}
      <p style="font-size: 14px; color: #888; line-height: 1.5;">
        If you have any questions, please reach out to your administrator.
      </p>
    `;

    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from: `${branding.business_name} <noreply@msjoschildcare.com>`,
      to: [applicantEmail],
      subject: `Application Received — ${branding.business_name}`,
      html: wrapEmail(branding, bodyHtml),
    });

    console.log('Registration email sent to:', applicantEmail);

    return new Response(JSON.stringify(emailResponse), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-registration-email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
