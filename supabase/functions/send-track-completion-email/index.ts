import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

interface TrackCompletionRequest {
  trackId: string;
  trackTitle: string;
}

async function sendEmail(to: string[], subject: string, html: string, fromName: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <noreply@childcarestafftraining.com>`,
      to, subject, html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const branding = await fetchBranding(supabaseAdmin);
    const brandColor = hslToHex(branding.primary_color);

    const { trackId, trackTitle }: TrackCompletionRequest = await req.json();

    if (!trackId || !trackTitle) {
      return new Response(JSON.stringify({ error: "Missing trackId or trackTitle" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("profiles").select("full_name, email").eq("user_id", userId).single();

    if (profileError || !userProfile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles").select("user_id").in("role", ["admin", "super_admin"]);

    const adminUserIds = (adminRoles || []).map((r) => r.user_id);
    let adminEmails: string[] = [];
    if (adminUserIds.length > 0) {
      const { data: adminProfiles } = await supabaseAdmin
        .from("profiles").select("email").in("user_id", adminUserIds);
      adminEmails = (adminProfiles || []).map((p) => p.email);
    }

    const completionDate = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // User email
    const userBodyHtml = `
      <h1 style="color: #333; margin-top: 0; font-size: 24px;">🎉 Congratulations, ${userProfile.full_name}!</h1>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        You have successfully completed the training track:
      </p>
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 20px;">${trackTitle}</h2>
      </div>
      <p style="font-size: 14px; color: #6b7280;">📅 Completed on: ${completionDate}</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Great job on finishing all the required materials. Keep up the excellent work!
      </p>
    `;

    const userEmailResult = await sendEmail(
      [userProfile.email],
      `🎉 Congratulations! You've completed "${trackTitle}"`,
      wrapEmail(branding, userBodyHtml),
      branding.business_name
    );
    console.log("User email sent:", userEmailResult);

    // Admin email
    if (adminEmails.length > 0) {
      const adminBodyHtml = `
        <h1 style="color: #333; margin-top: 0; font-size: 24px;">📚 Training Track Completed</h1>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">
          A staff member has completed a training track:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 130px;">Staff Member:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #333;">${userProfile.full_name}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #333;">${userProfile.email}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Track:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #333;">${trackTitle}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #6b7280;">Completed:</td>
            <td style="padding: 12px; color: #333;">${completionDate}</td>
          </tr>
        </table>
      `;

      const adminEmailResult = await sendEmail(
        adminEmails,
        `Staff Training Completed: ${userProfile.full_name} finished "${trackTitle}"`,
        wrapEmail(branding, adminBodyHtml),
        branding.business_name
      );
      console.log("Admin email sent:", adminEmailResult);
    }

    return new Response(JSON.stringify({
      success: true, message: "Completion emails sent successfully",
      userEmail: userProfile.email, adminCount: adminEmails.length,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-track-completion-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
