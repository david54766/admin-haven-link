import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

interface ApplicationNotificationRequest {
  applicationData: Record<string, string>;
  applicantName: string;
  applicantEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationData, applicantName, applicantEmail }: ApplicationNotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const branding = await fetchBranding(supabase);

    const { data: recipients, error: recipientsError } = await supabase
      .from("application_notification_recipients")
      .select("email, name")
      .eq("is_active", true);

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      throw new Error("Failed to fetch notification recipients");
    }

    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ message: "No recipients configured" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const applicationRows = Object.entries(applicationData)
      .map(([label, value]) => `<tr><td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: 500; color: #555;">${label}</td><td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${value}</td></tr>`)
      .join("");

    const bodyHtml = `
      <h1 style="color: #333; margin-top: 0; font-size: 24px;">📋 New Staff Application</h1>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        A new staff application has been submitted by <strong>${applicantName}</strong> (${applicantEmail}).
      </p>
      <h3 style="color: #333; margin-top: 25px; font-size: 16px;">Application Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        ${applicationRows}
      </table>
      <div style="margin-top: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
        <p style="margin: 0; color: #555; font-size: 14px;">
          <strong>Next Steps:</strong> Review this application in the admin dashboard and approve or reject the user's access.
        </p>
      </div>
    `;

    const recipientEmails = recipients.map(r => r.email);

    const emailResponse = await resend.emails.send({
      from: `${branding.business_name} <noreply@msjoschildcare.com>`,
      to: recipientEmails,
      subject: `New Staff Application: ${applicantName}`,
      html: wrapEmail(branding, bodyHtml),
    });

    console.log("Application notification sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-application-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
