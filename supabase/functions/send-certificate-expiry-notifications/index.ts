import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_WINDOWS = [7, 15, 30, 60, 90];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Branding { business_name: string; logo_url: string | null; primary_color: string; }
interface Cert { id: string; user_id: string; tenant_id: string; title: string; expiry_date: string; issuing_organization: string | null; }
interface Profile { user_id: string; email: string; full_name: string; }

function hslToHex(hslStr: string): string {
  const parts = (hslStr || "280 85% 65%").split(/\s+/);
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

function daysUntil(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

async function sendEmail(to: string[], subject: string, html: string, fromName: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `${fromName} <noreply@childcarestafftraining.com>`, to, subject, html }),
  });
  if (!response.ok) throw new Error(`Failed to send email: ${await response.text()}`);
  return response.json();
}

function brandingFromTenant(t: any): Branding {
  const b = t?.branding || {};
  return {
    business_name: b.business_name || t?.name || 'Training Portal',
    logo_url: b.logo_url || null,
    primary_color: b.primary_color || '280 85% 65%',
  };
}

async function getTenantWindows(admin: any, tenantId: string): Promise<{ enabled: boolean; windows: number[] }> {
  const { data } = await admin.from('system_settings').select('value').eq('tenant_id', tenantId).eq('key', 'certificate_expiry_reminders').maybeSingle();
  const v: any = data?.value || {};
  return {
    enabled: v.enabled !== false,
    windows: Array.isArray(v.windows) && v.windows.length ? v.windows.map((n: any) => Number(n)).filter((n: number) => !isNaN(n)) : DEFAULT_WINDOWS,
  };
}

async function processTenant(admin: any, tenant: any, mode: 'scheduled' | 'manual', targetUserId: string | null) {
  const tenantId = tenant.id;
  const branding = brandingFromTenant(tenant);
  const cfg = await getTenantWindows(admin, tenantId);
  if (mode === 'scheduled' && !cfg.enabled) return { tenantId, skipped: 'disabled', sent: 0 };

  const today = new Date().toISOString().split('T')[0];
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + Math.max(...cfg.windows, 90));
  const horizonStr = horizon.toISOString().split('T')[0];

  let q = admin.from('staff_certificates')
    .select('id, user_id, tenant_id, title, expiry_date, issuing_organization')
    .eq('tenant_id', tenantId)
    .gte('expiry_date', today)
    .lte('expiry_date', horizonStr);
  if (targetUserId) q = q.eq('user_id', targetUserId);

  const { data: certs } = await q;
  if (!certs || certs.length === 0) return { tenantId, sent: 0 };

  // Filter to certs matching a window in scheduled mode
  const eligible: Cert[] = (certs as Cert[]).filter((c) => {
    const d = daysUntil(c.expiry_date);
    if (mode === 'scheduled') return cfg.windows.includes(d);
    return d >= 0 && d <= 90;
  });
  if (eligible.length === 0) return { tenantId, sent: 0 };

  // Dedupe (only for scheduled mode)
  let toNotify = eligible;
  if (mode === 'scheduled') {
    const ids = eligible.map((c) => c.id);
    const { data: already } = await admin.from('certificate_expiry_notifications')
      .select('certificate_id, days_window')
      .in('certificate_id', ids)
      .eq('sent_on', today);
    const seen = new Set((already || []).map((r: any) => `${r.certificate_id}:${r.days_window}`));
    toNotify = eligible.filter((c) => !seen.has(`${c.id}:${daysUntil(c.expiry_date)}`));
  }
  if (toNotify.length === 0) return { tenantId, sent: 0 };

  // Profiles
  const userIds = [...new Set(toNotify.map((c) => c.user_id))];
  const { data: profiles } = await admin.from('profiles').select('user_id, email, full_name').in('user_id', userIds);
  const profileMap = new Map<string, Profile>();
  (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));

  // Tenant admin emails
  const { data: tenantProfiles } = await admin.from('profiles').select('user_id, email').eq('tenant_id', tenantId);
  const tenantUserIds = (tenantProfiles || []).map((p: any) => p.user_id);
  const emailByUserId = new Map<string, string>((tenantProfiles || []).map((p: any) => [p.user_id, p.email]));
  const { data: roles } = await admin.from('user_roles').select('user_id, role').in('user_id', tenantUserIds.length ? tenantUserIds : ['00000000-0000-0000-0000-000000000000']);
  const adminEmails = [...new Set((roles || []).filter((r: any) => ['admin','super_admin','director'].includes(r.role)).map((r: any) => emailByUserId.get(r.user_id)).filter(Boolean) as string[])];

  // Group by user
  const byUser = new Map<string, Cert[]>();
  toNotify.forEach((c) => { const a = byUser.get(c.user_id) || []; a.push(c); byUser.set(c.user_id, a); });

  let sent = 0;
  // Staff emails
  for (const [uid, list] of byUser) {
    const profile = profileMap.get(uid);
    if (!profile?.email) continue;
    const rows = list.map((c) => {
      const d = daysUntil(c.expiry_date);
      const color = d <= 7 ? '#dc2626' : d <= 15 ? '#ea580c' : d <= 30 ? '#f59e0b' : '#3b82f6';
      const exp = new Date(c.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      return `<tr><td style="padding:12px;border-bottom:1px solid #e5e7eb"><strong>${c.title}</strong>${c.issuing_organization ? `<br><span style="font-size:12px;color:#6b7280">${c.issuing_organization}</span>` : ''}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb">${exp}</td><td style="padding:12px;border-bottom:1px solid #e5e7eb"><span style="background:${color};color:#fff;padding:4px 8px;border-radius:4px;font-size:12px">${d} day${d===1?'':'s'}</span></td></tr>`;
    }).join('');
    const html = wrapEmail(branding, `
      <h1 style="color:#333;margin-top:0;font-size:24px">⚠️ Certificate Expiration Reminder</h1>
      <p style="font-size:16px;color:#555">Hi ${profile.full_name},</p>
      <p style="font-size:16px;color:#555">The following certificate(s) are expiring soon. Please upload renewed copies before they expire.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead><tr style="background:#f3f4f6"><th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb">Certificate</th><th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb">Expires</th><th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb">Time Left</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
    try {
      await sendEmail([profile.email], `⚠️ ${list.length} Certificate(s) Expiring Soon`, html, branding.business_name);
      sent++;
    } catch (e) { console.error(`staff email failed (${profile.email}):`, e); }
  }

  // Admin summary
  if (adminEmails.length > 0) {
    const rows = toNotify.map((c) => {
      const p = profileMap.get(c.user_id);
      const d = daysUntil(c.expiry_date);
      const color = d <= 7 ? '#dc2626' : d <= 15 ? '#ea580c' : d <= 30 ? '#f59e0b' : '#3b82f6';
      const exp = new Date(c.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      return `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb"><strong>${p?.full_name || 'Unknown'}</strong><br><span style="font-size:12px;color:#6b7280">${p?.email || ''}</span></td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${c.title}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb">${exp}</td><td style="padding:10px;border-bottom:1px solid #e5e7eb"><span style="background:${color};color:#fff;padding:4px 8px;border-radius:4px;font-size:12px">${d} day${d===1?'':'s'}</span></td></tr>`;
    }).join('');
    const html = wrapEmail(branding, `
      <h1 style="color:#333;margin-top:0;font-size:24px">📋 Certificate Expiration Summary</h1>
      <div style="background:#fef3c7;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #f59e0b"><strong>${toNotify.length} certificate(s)</strong> across <strong>${byUser.size} staff member(s)</strong></div>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead><tr style="background:#f3f4f6"><th style="padding:10px;text-align:left;border-bottom:2px solid #e5e7eb">Staff Member</th><th style="padding:10px;text-align:left;border-bottom:2px solid #e5e7eb">Certificate</th><th style="padding:10px;text-align:left;border-bottom:2px solid #e5e7eb">Expires</th><th style="padding:10px;text-align:left;border-bottom:2px solid #e5e7eb">Time Left</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
    try {
      await sendEmail(adminEmails, `📋 ${toNotify.length} Staff Certificate(s) Expiring Soon`, html, branding.business_name);
    } catch (e) { console.error('admin summary failed:', e); }
  }

  // Record sends (scheduled only)
  if (mode === 'scheduled') {
    const rows = toNotify.map((c) => ({
      certificate_id: c.id, user_id: c.user_id, tenant_id: tenantId,
      days_window: daysUntil(c.expiry_date), sent_on: today,
    }));
    if (rows.length) await admin.from('certificate_expiry_notifications').upsert(rows, { onConflict: 'certificate_id,days_window,sent_on' });
  }

  return { tenantId, sent, eligible: eligible.length, notified: toNotify.length };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let mode: 'scheduled' | 'manual' = 'manual';
    let targetUserId: string | null = null;
    let targetTenantId: string | null = null;
    try {
      const body = await req.json();
      if (body?.mode === 'scheduled') mode = 'scheduled';
      targetUserId = body?.user_id || null;
      targetTenantId = body?.tenant_id || null;
    } catch { /* no body */ }

    let tenantsQuery = admin.from('tenants').select('id, name, branding, is_active').eq('is_active', true);
    if (targetTenantId) tenantsQuery = tenantsQuery.eq('id', targetTenantId);
    const { data: tenants, error } = await tenantsQuery;
    if (error) throw error;

    const results = [];
    for (const t of tenants || []) {
      try { results.push(await processTenant(admin, t, mode, targetUserId)); }
      catch (e: any) { console.error(`tenant ${t.id} failed:`, e); results.push({ tenantId: t.id, error: e?.message }); }
    }

    const totalNotified = results.reduce((s: number, r: any) => s + (r?.notified || 0), 0);
    const totalEligible = results.reduce((s: number, r: any) => s + (r?.eligible || 0), 0);
    return new Response(JSON.stringify({
      success: true, mode,
      tenantsProcessed: tenants?.length || 0,
      expiringCertificates: totalEligible,
      staffNotified: totalNotified,
      adminNotified: results.length,
      results,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("send-certificate-expiry-notifications error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
