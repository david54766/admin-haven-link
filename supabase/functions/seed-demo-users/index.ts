import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USERS = [
  { email: "sarah.johnson@demo.test", full_name: "Sarah Johnson", position: "Lead Teacher", phone: "(555) 101-2001", hire_date: "2024-06-15" },
  { email: "michael.chen@demo.test", full_name: "Michael Chen", position: "Assistant Teacher", phone: "(555) 101-2002", hire_date: "2024-09-01" },
  { email: "emily.rodriguez@demo.test", full_name: "Emily Rodriguez", position: "Pre-K Teacher", phone: "(555) 101-2003", hire_date: "2024-07-20" },
  { email: "david.thompson@demo.test", full_name: "David Thompson", position: "Infant Room Teacher", phone: "(555) 101-2004", hire_date: "2025-01-10" },
  { email: "jessica.williams@demo.test", full_name: "Jessica Williams", position: "Toddler Room Teacher", phone: "(555) 101-2005", hire_date: "2024-11-05" },
  { email: "robert.davis@demo.test", full_name: "Robert Davis", position: "Floater", phone: "(555) 101-2006", hire_date: "2025-05-01" },
  { email: "amanda.martinez@demo.test", full_name: "Amanda Martinez", position: "Teacher Aide", phone: "(555) 101-2007", hire_date: "2025-02-14" },
  { email: "james.wilson@demo.test", full_name: "James Wilson", position: "Cook / Kitchen Staff", phone: "(555) 101-2008", hire_date: "2025-08-20" },
  { email: "lisa.brown@demo.test", full_name: "Lisa Brown", position: "Bus Driver", phone: "(555) 101-2009", hire_date: "2025-06-10" },
  { email: "chris.lee@demo.test", full_name: "Christopher Lee", position: "Administrative Assistant", phone: "(555) 101-2010", hire_date: "2024-08-01" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results = [];

    for (const u of USERS) {
      // Create auth user
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: "DemoUser-2026!",
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (userError) {
        // If user exists, find them
        if (userError.message.includes("already been registered")) {
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const existing = users?.find(x => x.email === u.email);
          if (existing) {
            results.push({ email: u.email, user_id: existing.id, existing: true });
          }
          continue;
        }
        throw userError;
      }

      const userId = userData.user.id;

      // Update profile
      await supabase
        .from("profiles")
        .update({
          status: "approved",
          full_name: u.full_name,
          phone: u.phone,
          position: u.position,
          hire_date: u.hire_date,
        })
        .eq("user_id", userId);

      // Assign staff role
      await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "staff" });

      results.push({ email: u.email, user_id: userId, existing: false });
    }

    return new Response(JSON.stringify({ success: true, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
