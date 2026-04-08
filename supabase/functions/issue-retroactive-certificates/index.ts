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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { track_id } = await req.json();
    if (!track_id) {
      return new Response(JSON.stringify({ error: "track_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get track details
    const { data: track, error: trackError } = await supabase
      .from("training_tracks")
      .select("*")
      .eq("id", track_id)
      .single();

    if (trackError || !track) {
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!track.certificate_enabled || !track.instructor_name) {
      return new Response(JSON.stringify({ error: "Certificates not properly configured for this track" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users assigned to this track
    const { data: assignments } = await supabase
      .from("staff_track_assignments")
      .select("user_id")
      .eq("track_id", track_id);

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ issued: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing certificates to avoid duplicates
    const { data: existingCerts } = await supabase
      .from("track_certificates")
      .select("user_id")
      .eq("track_id", track_id);

    const existingUserIds = new Set((existingCerts || []).map((c: any) => c.user_id));

    // Get all modules with their content for this track
    const { data: modules } = await supabase
      .from("modules")
      .select(`
        id, is_active,
        videos(id, is_required, duration_seconds),
        quizzes(id, is_required),
        homework_assignments(id, is_required),
        module_presentations(id, is_required),
        module_documents(id, is_required)
      `)
      .eq("track_id", track_id)
      .eq("is_active", true);

    if (!modules || modules.length === 0) {
      return new Response(JSON.stringify({ issued: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate total training hours from video durations
    let totalSeconds = 0;
    for (const mod of modules) {
      for (const video of (mod.videos || [])) {
        if (video.duration_seconds) totalSeconds += video.duration_seconds;
      }
    }
    const hoursEarned = Math.round((totalSeconds / 3600) * 10) / 10;

    // Build required items list
    const requiredItems: { type: string; id: string }[] = [];
    for (const mod of modules) {
      for (const v of (mod.videos || [])) {
        if (v.is_required) requiredItems.push({ type: "video", id: v.id });
      }
      for (const q of (mod.quizzes || [])) {
        if (q.is_required) requiredItems.push({ type: "quiz", id: q.id });
      }
      for (const h of (mod.homework_assignments || [])) {
        if (h.is_required) requiredItems.push({ type: "homework", id: h.id });
      }
      for (const p of (mod.module_presentations || [])) {
        if (p.is_required) requiredItems.push({ type: "presentation", id: p.id });
      }
      for (const d of (mod.module_documents || [])) {
        if (d.is_required) requiredItems.push({ type: "document", id: d.id });
      }
    }

    if (requiredItems.length === 0) {
      return new Response(JSON.stringify({ issued: 0, message: "No required items in track" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For each assigned user (without existing cert), check completion
    const usersToCheck = assignments
      .map((a: any) => a.user_id)
      .filter((uid: string) => !existingUserIds.has(uid));

    if (usersToCheck.length === 0) {
      return new Response(JSON.stringify({ issued: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all progress data in bulk
    const videoIds = requiredItems.filter(i => i.type === "video").map(i => i.id);
    const quizIds = requiredItems.filter(i => i.type === "quiz").map(i => i.id);
    const homeworkIds = requiredItems.filter(i => i.type === "homework").map(i => i.id);
    const presentationIds = requiredItems.filter(i => i.type === "presentation").map(i => i.id);
    const documentIds = requiredItems.filter(i => i.type === "document").map(i => i.id);

    const [videoProgress, quizAttempts, homeworkSubs, presProgress, docProgress] = await Promise.all([
      videoIds.length > 0
        ? supabase.from("video_progress").select("user_id, video_id, completed_at").in("video_id", videoIds).in("user_id", usersToCheck).not("completed_at", "is", null)
        : { data: [] },
      quizIds.length > 0
        ? supabase.from("quiz_attempts").select("user_id, quiz_id, passed").in("quiz_id", quizIds).in("user_id", usersToCheck).eq("passed", true)
        : { data: [] },
      homeworkIds.length > 0
        ? supabase.from("homework_submissions").select("user_id, homework_id, reviewed_status").in("homework_id", homeworkIds).in("user_id", usersToCheck).eq("reviewed_status", "approved")
        : { data: [] },
      presentationIds.length > 0
        ? supabase.from("presentation_progress").select("user_id, presentation_id, completed_at").in("presentation_id", presentationIds).in("user_id", usersToCheck).not("completed_at", "is", null)
        : { data: [] },
      documentIds.length > 0
        ? supabase.from("document_progress").select("user_id, document_id, completed_at").in("document_id", documentIds).in("user_id", usersToCheck).not("completed_at", "is", null)
        : { data: [] },
    ]);

    // Build completion sets per user
    const userCompletions: Record<string, Set<string>> = {};
    for (const uid of usersToCheck) {
      userCompletions[uid] = new Set();
    }

    for (const r of (videoProgress.data || [])) {
      userCompletions[r.user_id]?.add(`video:${r.video_id}`);
    }
    for (const r of (quizAttempts.data || [])) {
      userCompletions[r.user_id]?.add(`quiz:${r.quiz_id}`);
    }
    for (const r of (homeworkSubs.data || [])) {
      userCompletions[r.user_id]?.add(`homework:${r.homework_id}`);
    }
    for (const r of (presProgress.data || [])) {
      userCompletions[r.user_id]?.add(`presentation:${r.presentation_id}`);
    }
    for (const r of (docProgress.data || [])) {
      userCompletions[r.user_id]?.add(`document:${r.document_id}`);
    }

    // Find users who completed all required items
    const completedUsers: string[] = [];
    for (const uid of usersToCheck) {
      const completed = userCompletions[uid];
      const allDone = requiredItems.every(item => completed.has(`${item.type}:${item.id}`));
      if (allDone) completedUsers.push(uid);
    }

    if (completedUsers.length === 0) {
      return new Response(JSON.stringify({ issued: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles for completed users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, center_id")
      .in("user_id", completedUsers);

    // Get all centers
    const centerIds = [...new Set((profiles || []).map((p: any) => p.center_id).filter(Boolean))];
    const { data: centers } = centerIds.length > 0
      ? await supabase.from("centers").select("id, name").in("id", centerIds)
      : { data: [] };
    const centerMap: Record<string, string> = {};
    for (const c of (centers || [])) {
      centerMap[c.id] = c.name;
    }

    // Insert certificates
    const certsToInsert = (profiles || []).map((p: any) => ({
      user_id: p.user_id,
      track_id: track_id,
      staff_name: p.full_name,
      center_name: p.center_id ? (centerMap[p.center_id] || "N/A") : "N/A",
      instructor_name: track.instructor_name,
      track_title: track.title,
      hours_earned: hoursEarned,
    }));

    const { error: insertError } = await supabase
      .from("track_certificates")
      .insert(certsToInsert);

    if (insertError) {
      console.error("Error inserting certificates:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ issued: certsToInsert.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
