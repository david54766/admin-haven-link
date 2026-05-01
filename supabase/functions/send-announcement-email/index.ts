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
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, priority, centerId } = await req.json();

    if (!title || !content) {
      return new Response(JSON.stringify({ error: 'title and content are required' }), {
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

    // Resolve caller's tenant from their JWT
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tenantId } = await adminClient.rpc('get_user_tenant_id', { _user_id: userData.user.id });
    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'Tenant not found for user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const branding = await fetchBranding(adminClient);
    const brandColor = hslToHex(branding.primary_color);

    // Fetch approved staff in caller's tenant only, filtered by center if specified
    let query = adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('status', 'approved')
      .eq('tenant_id', tenantId);

    if (centerId) {
      query = query.eq('center_id', centerId);
    }

    const { data: profiles } = await query;

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No recipients found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const priorityLabel = priority === 'urgent' ? '🔴 URGENT' : priority === 'important' ? '🟡 Important' : '';
    const priorityBanner = priorityLabel
      ? `<div style="background-color: ${priority === 'urgent' ? '#fee2e2' : '#fef9c3'}; padding: 10px 16px; border-radius: 6px; margin-bottom: 20px; text-align: center;"><strong>${priorityLabel}</strong></div>`
      : '';

    const bodyHtml = `
      <h1 style="color: #333; margin-top: 0; font-size: 24px;">📢 ${title}</h1>
      ${priorityBanner}
      <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${brandColor};">
        <p style="margin: 0; font-size: 16px; color: #555; line-height: 1.6; white-space: pre-wrap;">${content}</p>
      </div>
      <p style="font-size: 14px; color: #888; line-height: 1.5;">
        This announcement was posted on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
      </p>
    `;

    const resend = new Resend(resendApiKey);
    const allEmails = profiles.map(p => p.email);

    // Send in batches of 50 to respect Resend rate limits
    const BATCH_SIZE = 50;
    let totalSent = 0;

    for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
      const batch = allEmails.slice(i, i + BATCH_SIZE);

      // Use BCC for privacy — send to first, bcc rest
      const [primary, ...bcc] = batch;
      await resend.emails.send({
        from: `${branding.business_name} <noreply@childcarestafftraining.com>`,
        to: [primary],
        bcc: bcc.length > 0 ? bcc : undefined,
        subject: `${priorityLabel ? priorityLabel + ' — ' : ''}${title} — ${branding.business_name}`,
        html: wrapEmail(branding, bodyHtml),
      });

      totalSent += batch.length;

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < allEmails.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    console.log(`Announcement email sent to ${totalSent} recipient(s)`);

    return new Response(JSON.stringify({ success: true, sent: totalSent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in send-announcement-email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
