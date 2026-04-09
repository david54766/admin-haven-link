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

interface Certificate {
  id: string;
  user_id: string;
  title: string;
  expiry_date: string;
  issuing_organization: string | null;
}

interface Profile {
  user_id: string;
  email: string;
  full_name: string;
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

function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const branding = await fetchBranding(supabaseAdmin);

    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.user_id || null;
    } catch { /* no body is fine */ }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = thirtyDaysFromNow.toISOString().split('T')[0];

    let query = supabaseAdmin
      .from("staff_certificates")
      .select("id, user_id, title, expiry_date, issuing_organization")
      .lte("expiry_date", futureStr);

    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    } else {
      query = query.gte("expiry_date", todayStr);
    }

    const { data: expiringCerts, error: certsError } = await query;
    if (certsError) throw new Error(`Error fetching certificates: ${certsError.message}`);

    if (!expiringCerts || expiringCerts.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No expiring certificates found", expiringCertificates: 0, staffNotified: 0, adminNotified: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(expiringCerts.map(c => c.user_id))];
    const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, email, full_name").in("user_id", userIds);
    const profileMap = new Map<string, Profile>();
    (profiles || []).forEach(p => profileMap.set(p.user_id, p as Profile));

    const { data: adminRoles } = await supabaseAdmin.from("user_roles").select("user_id").in("role", ["admin", "super_admin"]);
    const adminUserIds = (adminRoles || []).map((r) => r.user_id);
    let adminEmails: string[] = [];
    if (adminUserIds.length > 0) {
      const { data: adminProfiles } = await supabaseAdmin.from("profiles").select("email").in("user_id", adminUserIds);
      adminEmails = (adminProfiles || []).map((p) => p.email);
    }

    const emailsSent: { to: string; subject: string }[] = [];
    const certsByUser = new Map<string, Certificate[]>();
    expiringCerts.forEach(cert => {
      const existing = certsByUser.get(cert.user_id) || [];
      existing.push(cert as Certificate);
      certsByUser.set(cert.user_id, existing);
    });

    // Staff notifications
    for (const [userId, certs] of certsByUser) {
      const profile = profileMap.get(userId);
      if (!profile) continue;

      const certListHtml = certs.map(cert => {
        const daysLeft = getDaysUntilExpiry(cert.expiry_date);
        const expiryDate = new Date(cert.expiry_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const urgencyColor = daysLeft <= 7 ? "#dc2626" : daysLeft <= 14 ? "#f59e0b" : "#3b82f6";
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <strong>${cert.title}</strong>
              ${cert.issuing_organization ? `<br><span style="font-size: 12px; color: #6b7280;">${cert.issuing_organization}</span>` : ""}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${expiryDate}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <span style="background-color: ${urgencyColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${daysLeft} days</span>
            </td>
          </tr>
        `;
      }).join("");

      const staffBodyHtml = `
        <h1 style="color: #333; margin-top: 0; font-size: 24px;">⚠️ Certificate Expiration Reminder</h1>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">Hi ${profile.full_name},</p>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">The following certificate(s) are expiring soon and may need to be renewed:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Certificate</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Expires</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Time Left</th>
            </tr>
          </thead>
          <tbody>${certListHtml}</tbody>
        </table>
        <p style="font-size: 14px; color: #6b7280;">Please take action to renew these certificates before they expire.</p>
      `;

      try {
        await sendEmail([profile.email], `⚠️ ${certs.length} Certificate(s) Expiring Soon`, wrapEmail(branding, staffBodyHtml), branding.business_name);
        emailsSent.push({ to: profile.email, subject: "Staff notification" });
      } catch (e) {
        console.error(`Failed to send email to ${profile.email}:`, e);
      }
    }

    // Admin summary
    if (adminEmails.length > 0) {
      const allCertsHtml = expiringCerts.map(cert => {
        const profile = profileMap.get(cert.user_id);
        const daysLeft = getDaysUntilExpiry(cert.expiry_date);
        const expiryDate = new Date(cert.expiry_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const urgencyColor = daysLeft <= 7 ? "#dc2626" : daysLeft <= 14 ? "#f59e0b" : "#3b82f6";
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${profile?.full_name || "Unknown"}</strong><br><span style="font-size: 12px; color: #6b7280;">${profile?.email || ""}</span></td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${cert.title}${cert.issuing_organization ? `<br><span style="font-size: 12px; color: #6b7280;">${cert.issuing_organization}</span>` : ""}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${expiryDate}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><span style="background-color: ${urgencyColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${daysLeft} days</span></td>
          </tr>
        `;
      }).join("");

      const adminBodyHtml = `
        <h1 style="color: #333; margin-top: 0; font-size: 24px;">📋 Certificate Expiration Summary</h1>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">The following staff certificates are expiring within the next 30 days:</p>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <strong>${expiringCerts.length} certificate(s)</strong> across <strong>${certsByUser.size} staff member(s)</strong>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Staff Member</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Certificate</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Expires</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Time Left</th>
            </tr>
          </thead>
          <tbody>${allCertsHtml}</tbody>
        </table>
      `;

      try {
        await sendEmail(adminEmails, `📋 ${expiringCerts.length} Staff Certificate(s) Expiring Soon`, wrapEmail(branding, adminBodyHtml), branding.business_name);
        emailsSent.push({ to: adminEmails.join(", "), subject: "Admin summary" });
      } catch (e) {
        console.error("Failed to send admin summary:", e);
      }
    }

    return new Response(JSON.stringify({
      success: true, message: "Expiration notifications sent",
      expiringCertificates: expiringCerts.length, staffNotified: certsByUser.size,
      adminNotified: adminEmails.length, emailsSent,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Error in send-certificate-expiry-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
