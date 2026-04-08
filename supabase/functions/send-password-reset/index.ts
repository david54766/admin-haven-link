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
    const { email, redirectTo } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
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

    // Generate a password reset link using the admin API
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (linkError) {
      console.error('Error generating reset link:', linkError);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hashedToken = linkData?.properties?.hashed_token;
    if (!hashedToken) {
      console.error('No hashed_token returned');
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the redirectTo from the client (which includes the correct origin)
    const baseUrl = redirectTo || 'https://bloom-team-link.lovable.app/reset-password';
    const resetLink = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token_hash=${hashedToken}&type=recovery`;

    const branding = await fetchBranding(adminClient);
    const brandColor = hslToHex(branding.primary_color);

    // Get user name if available
    let userName = 'there';
    try {
      const { data: profile } = await adminClient.from('profiles').select('full_name').eq('email', email).maybeSingle();
      if (profile?.full_name) userName = profile.full_name;
    } catch (e) { /* ignore */ }

    const bodyHtml = `
      <h1 style="color: #333; margin-top: 0; font-size: 24px;">Password Reset Request 🔐</h1>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        We received a request to reset your password for your <strong>${branding.business_name}</strong> account. Click the button below to set a new password.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset My Password</a>
      </div>
      <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${brandColor};">
        <p style="margin: 0; color: #555; font-size: 14px;">
          <strong>⏰ This link expires in 1 hour.</strong> If you didn't request this reset, you can safely ignore this email — your password will remain unchanged.
        </p>
      </div>
      <p style="font-size: 13px; color: #999; line-height: 1.5;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetLink}" style="color: ${brandColor}; word-break: break-all;">${resetLink}</a>
      </p>
    `;

    const resend = new Resend(resendApiKey);
    const emailResult = await resend.emails.send({
      from: `${branding.business_name} <noreply@msjoschildcare.com>`,
      to: [email],
      subject: `Password Reset — ${branding.business_name}`,
      html: wrapEmail(branding, bodyHtml),
    });

    console.log('Resend API response:', JSON.stringify(emailResult));
    console.log('Password reset email sent to:', email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-password-reset:', error);
    // Return success to prevent email enumeration
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
