import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const KINDS: Record<string, string> = {
  document: 'Document',
  certificate: 'Certificate',
  external_training: 'Outside training certificate',
  homework: 'Homework',
  important_document: 'Required document',
};

function wrap(name: string, logo: string | null, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
  <div style="padding:24px;text-align:center;border-bottom:1px solid #e5e7eb">${logo ? `<img src="${esc(logo)}" alt="" style="max-height:48px"/><br/>` : ''}<strong style="font-size:20px">${esc(name)}</strong></div>
  <div style="padding:24px;color:#333;font-size:15px;line-height:1.6">${body}</div>
  <p style="text-align:center;font-size:12px;color:#9ca3af">&copy; ${new Date().getFullYear()} ${esc(name)}</p></div>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { kind, title, fileName } = await req.json();
    const label = KINDS[kind];
    if (!label) return json({ error: 'Invalid kind' }, 400);
    const key = Deno.env.get('RESEND_API_KEY');
    if (!key) return json({ error: 'Email service not configured' }, 500);

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization') || '';
    const { data: u } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!u?.user) return json({ error: 'Unauthorized' }, 401);

    const { data: me } = await admin.from('profiles').select('full_name,email,tenant_id').eq('user_id', u.user.id).maybeSingle();
    if (!me?.tenant_id) return json({ error: 'Profile not found' }, 400);
    const tenantId = me.tenant_id;

    const { data: tenant } = await admin.from('tenants').select('name,branding').eq('id', tenantId).maybeSingle();
    const { data: bs } = await admin.from('system_settings').select('value').eq('key', 'branding').eq('tenant_id', tenantId).maybeSingle();
    const bname = (bs?.value as any)?.business_name || (tenant?.branding as any)?.business_name || tenant?.name || 'Childcare Staff Training';
    const logo = (bs?.value as any)?.logo_url || (tenant?.branding as any)?.logo_url || null;

    // Admins of this tenant only (exclude platform admins and the uploader)
    const { data: roles } = await admin.from('user_roles').select('user_id').eq('tenant_id', tenantId).in('role', ['admin', 'director', 'super_admin']);
    const adminIds = [...new Set((roles ?? []).map((r) => r.user_id))].filter((id) => id !== u.user.id);
    let adminEmails: string[] = [];
    if (adminIds.length) {
      const { data: ps } = await admin.from('profiles').select('email').in('user_id', adminIds).eq('tenant_id', tenantId).eq('status', 'approved');
      adminEmails = [...new Set((ps ?? []).map((p) => p.email).filter(Boolean))];
    }

    const resend = new Resend(key);
    const from = `${bname} <noreply@childcarestafftraining.com>`;
    const when = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/New_York' });
    const details = `<p><strong>Type:</strong> ${esc(label)}<br/><strong>Title:</strong> ${esc(title || '—')}<br/>${fileName ? `<strong>File:</strong> ${esc(fileName)}<br/>` : ''}<strong>Uploaded:</strong> ${when} (ET)</p>`;

    let sentAdmins = 0;
    if (adminEmails.length) {
      const [to, ...bcc] = adminEmails;
      await resend.emails.send({
        from, to: [to], bcc: bcc.length ? bcc : undefined,
        subject: `New upload from ${me.full_name}: ${label}`,
        html: wrap(bname, logo, `<h2 style="margin-top:0">New staff upload</h2><p><strong>${esc(me.full_name)}</strong> (${esc(me.email)}) uploaded a new item.</p>${details}<p>Sign in to the training portal to review it.</p>`),
      });
      sentAdmins = adminEmails.length;
    }

    await resend.emails.send({
      from, to: [me.email],
      subject: `We received your ${label.toLowerCase()}`,
      html: wrap(bname, logo, `<h2 style="margin-top:0">Upload received</h2><p>Hi ${esc(me.full_name)}, thanks — we received your upload.</p>${details}<p>Your administrator has been notified.</p>`),
    });

    return json({ success: true, admins: sentAdmins, staff: 1 });
  } catch (e: any) {
    console.error('send-upload-notification', e);
    return json({ error: e.message }, 500);
  }
});
