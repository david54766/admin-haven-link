import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify platform admin
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Unauthorized: platform admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent deleting the Platform tenant
    if (tenant_id === "00000000-0000-0000-0000-000000000001") {
      return new Response(JSON.stringify({ error: "Cannot delete the Platform tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all user_ids for this tenant to delete auth users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("tenant_id", tenant_id);

    const userIds = (profiles || []).map((p: any) => p.user_id);

    // Delete all tenant data in dependency order
    const tables = [
      "checklist_submission_items",
      "checklist_submissions",
      "checklist_items",
      "checklist_templates",
      "reflection_responses",
      "self_reflections",
      "quiz_attempts",
      "quiz_questions",
      "quizzes",
      "homework_submissions",
      "homework_assignments",
      "lesson_progress",
      "lesson_pages",
      "module_lessons",
      "document_progress",
      "module_documents",
      "presentation_progress",
      "module_presentations",
      "external_training_submissions",
      "module_external_trainings",
      "module_certificates",
      "modules",
      "staff_track_assignments",
      "track_position_assignments",
      "training_tracks",
      "important_document_submissions",
      "shared_resources",
      "staff_certificates",
      "staff_documents",
      "document_types",
      "expenses",
      "calendar_events",
      "admin_announcements",
      "application_notification_recipients",
      "application_form_fields",
      "certificate_templates",
      "positions",
      "user_roles",
      "profiles",
      "tenant_branding",
      "tenant_compliance_settings",
      "tenant_content_defaults",
      "centers",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("tenant_id", tenant_id);
      if (error) {
        console.log(`Warning deleting from ${table}: ${error.message}`);
      }
    }

    // Delete auth users
    for (const uid of userIds) {
      const { error } = await supabase.auth.admin.deleteUser(uid);
      if (error) {
        console.log(`Warning deleting auth user ${uid}: ${error.message}`);
      }
    }

    // Finally delete the tenant
    const { error: tenantError } = await supabase.from("tenants").delete().eq("id", tenant_id);
    if (tenantError) {
      return new Response(JSON.stringify({ error: tenantError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
