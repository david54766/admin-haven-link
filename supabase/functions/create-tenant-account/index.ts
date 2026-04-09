import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Verify caller is platform_admin
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
    const { data: callerRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id);

    const isPlatformAdmin = (callerRoles || []).some((r: any) => r.role === 'platform_admin');
    if (!isPlatformAdmin) {
      return new Response(JSON.stringify({ error: 'Only platform admins can create tenants' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { tenant_name, slug, contact_name, contact_email, admin_password } = body;

    if (!tenant_name || !slug || !contact_email || !admin_password) {
      return new Response(JSON.stringify({ error: 'tenant_name, slug, contact_email, and admin_password are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .insert({
        name: tenant_name,
        slug,
        contact_email,
        contact_name: contact_name || null,
        is_active: true,
      })
      .select()
      .single();

    if (tenantError) {
      return new Response(JSON.stringify({ error: `Failed to create tenant: ${tenantError.message}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create admin user
    const { data: userData, error: createUserError } = await adminClient.auth.admin.createUser({
      email: contact_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        full_name: contact_name || tenant_name,
        tenant_id: tenant.id,
      },
    });

    if (createUserError) {
      // Rollback tenant
      await adminClient.from('tenants').delete().eq('id', tenant.id);
      return new Response(JSON.stringify({ error: `Failed to create admin user: ${createUserError.message}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // 3. Create/update profile linked to tenant
    await adminClient.from('profiles').upsert({
      user_id: userId,
      email: contact_email,
      full_name: contact_name || tenant_name,
      status: 'approved',
      tenant_id: tenant.id,
    }, { onConflict: 'user_id' });

    // 4. Assign director role
    await adminClient.from('user_roles').insert({
      user_id: userId,
      role: 'director',
      tenant_id: tenant.id,
    });

    // 5. Send welcome email via Resend
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey) {
        const loginUrl = 'https://childcarestafftraining.com/login';

        const html = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Childcare Staff Training</h2>
            </div>
            <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h1 style="color: #333; margin-top: 0; font-size: 24px;">Welcome aboard! 🎉</h1>
              <p style="font-size: 16px; color: #555; line-height: 1.6;">
                Hi <strong>${contact_name || 'Admin'}</strong>,
              </p>
              <p style="font-size: 16px; color: #555; line-height: 1.6;">
                Your organization <strong>${tenant_name}</strong> has been set up on the Childcare Staff Training platform. You can now log in and start configuring your training portal.
              </p>
              <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #2563eb;">
                <h3 style="margin-top: 0; color: #333; font-size: 16px;">Your Login Details</h3>
                <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${contact_email}</p>
                <p style="margin: 8px 0; color: #555;"><strong>Password:</strong> ${admin_password}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Log In Now</a>
              </div>
              <h3 style="color: #333; font-size: 16px;">Getting Started</h3>
              <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li>Log in with your credentials above</li>
                <li>Set up your centers and positions</li>
                <li>Create training tracks and modules</li>
                <li>Invite your staff members</li>
              </ol>
              <p style="font-size: 14px; color: #888; line-height: 1.5;">
                🔒 We recommend changing your password after your first login.
              </p>
            </div>
            <div style="text-align: center; padding: 20px 30px;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                &copy; ${new Date().getFullYear()} Childcare Staff Training. All rights reserved.
              </p>
            </div>
          </div>
        `;

        const { Resend } = await import("npm:resend@2.0.0");
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: 'Childcare Staff Training <noreply@childcarestafftraining.com>',
          to: [contact_email],
          subject: `Welcome to Childcare Staff Training — ${tenant_name}`,
          html,
        });
        console.log('Welcome email sent to:', contact_email);
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return new Response(JSON.stringify({
      success: true,
      tenant_id: tenant.id,
      user_id: userId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});