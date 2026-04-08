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
      <!-- Header -->
      <div style="background: linear-gradient(135deg, ${brandColor}, ${brandColor}dd); padding: 30px 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
        ${logoHtml}
        <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">${branding.business_name}</h2>
      </div>
      <!-- Body -->
      <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        ${body}
      </div>
      <!-- Footer -->
      <div style="text-align: center; padding: 20px 30px;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          &copy; ${new Date().getFullYear()} ${branding.business_name}. All rights reserved.
        </p>
        <p style="font-size: 11px; color: #9ca3af; margin: 5px 0 0;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerRoles } = await adminClient.from('user_roles').select('role').eq('user_id', callerUser.id);

    const callerRoleList = (callerRoles || []).map((r: any) => r.role);
    const callerIsSuperAdmin = callerRoleList.includes('super_admin');
    const callerIsDirector = callerRoleList.includes('director');

    if (!callerIsSuperAdmin && !callerIsDirector) {
      return new Response(JSON.stringify({ error: 'Only admins can create accounts' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { email, password, full_name, role, center_id, position } = body;

    if (callerIsDirector && !callerIsSuperAdmin && role && role !== 'staff') {
      return new Response(JSON.stringify({ error: 'Directors can only create staff accounts' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Email, password, and full name are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    const { error: profileError } = await adminClient.from('profiles').upsert({
      user_id: userId, email, full_name, status: 'approved',
      center_id: center_id || null, position: position || null,
    }, { onConflict: 'user_id' });

    if (profileError) console.error('Profile update error:', profileError);

    const userRole = role || 'staff';
    const { error: roleError } = await adminClient.from('user_roles').insert({ user_id: userId, role: userRole });
    if (roleError) console.error('Role insert error:', roleError);

    // Send welcome email
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const branding = await fetchBranding(adminClient);

        let centerName = '';
        if (center_id) {
          const { data: centerData } = await adminClient.from('centers').select('name').eq('id', center_id).single();
          centerName = centerData?.name || '';
        }

        const loginUrl = 'https://msjoschildcare.com';
        const brandColor = hslToHex(branding.primary_color);

        const bodyHtml = `
          <h1 style="color: #333; margin-top: 0; font-size: 24px;">Welcome aboard! 🎉</h1>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Hi <strong>${full_name}</strong>,
          </p>
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            An account has been created for you at <strong>${branding.business_name}</strong>. You can now log in and start your training.
          </p>
          <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${brandColor};">
            <h3 style="margin-top: 0; color: #333; font-size: 16px;">Your Login Details</h3>
            <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0; color: #555;"><strong>Password:</strong> ${password}</p>
            ${centerName ? `<p style="margin: 8px 0; color: #555;"><strong>Center:</strong> ${centerName}</p>` : ''}
            ${position ? `<p style="margin: 8px 0; color: #555;"><strong>Position:</strong> ${position}</p>` : ''}
          </div>
          ${loginUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}/login" style="display: inline-block; padding: 14px 32px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Log In Now</a>
            </div>
          ` : ''}
          <p style="font-size: 14px; color: #888; line-height: 1.5;">
            🔒 We recommend changing your password after your first login for security purposes.
          </p>
        `;

        await resend.emails.send({
          from: `${branding.business_name} <noreply@msjoschildcare.com>`,
          to: [email],
          subject: `Welcome to ${branding.business_name} — Your Account is Ready`,
          html: wrapEmail(branding, bodyHtml),
        });

        console.log('Welcome email sent to:', email);
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
