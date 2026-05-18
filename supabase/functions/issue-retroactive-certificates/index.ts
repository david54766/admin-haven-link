import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequiredItem = { type: string; id: string };

async function getCompletionsByUser(
  supabase: any,
  requiredItems: RequiredItem[],
  userIds: string[]
) {
  const videoIds = requiredItems.filter((i) => i.type === "video").map((i) => i.id);
  const quizIds = requiredItems.filter((i) => i.type === "quiz").map((i) => i.id);
  const homeworkIds = requiredItems.filter((i) => i.type === "homework").map((i) => i.id);
  const presIds = requiredItems.filter((i) => i.type === "presentation").map((i) => i.id);
  const docIds = requiredItems.filter((i) => i.type === "document").map((i) => i.id);
  const lessonIds = requiredItems.filter((i) => i.type === "lesson").map((i) => i.id);

  const [vp, qa, hs, pp, dp, lp] = await Promise.all([
    videoIds.length
      ? supabase.from("video_progress").select("user_id, video_id, completed_at").in("video_id", videoIds).in("user_id", userIds).not("completed_at", "is", null)
      : { data: [] },
    quizIds.length
      ? supabase.from("quiz_attempts").select("user_id, quiz_id, passed").in("quiz_id", quizIds).in("user_id", userIds).eq("passed", true)
      : { data: [] },
    homeworkIds.length
      ? supabase.from("homework_submissions").select("user_id, homework_id, reviewed_status").in("homework_id", homeworkIds).in("user_id", userIds).eq("reviewed_status", "approved")
      : { data: [] },
    presIds.length
      ? supabase.from("presentation_progress").select("user_id, presentation_id, completed_at").in("presentation_id", presIds).in("user_id", userIds).not("completed_at", "is", null)
      : { data: [] },
    docIds.length
      ? supabase.from("document_progress").select("user_id, document_id, completed_at").in("document_id", docIds).in("user_id", userIds).not("completed_at", "is", null)
      : { data: [] },
    lessonIds.length
      ? supabase.from("lesson_progress").select("user_id, lesson_id, completed_at").in("lesson_id", lessonIds).in("user_id", userIds).not("completed_at", "is", null)
      : { data: [] },
  ]);

  const map: Record<string, Set<string>> = {};
  for (const uid of userIds) map[uid] = new Set();
  for (const r of vp.data || []) map[r.user_id]?.add(`video:${r.video_id}`);
  for (const r of qa.data || []) map[r.user_id]?.add(`quiz:${r.quiz_id}`);
  for (const r of hs.data || []) map[r.user_id]?.add(`homework:${r.homework_id}`);
  for (const r of pp.data || []) map[r.user_id]?.add(`presentation:${r.presentation_id}`);
  for (const r of dp.data || []) map[r.user_id]?.add(`document:${r.document_id}`);
  for (const r of lp.data || []) map[r.user_id]?.add(`lesson:${r.lesson_id}`);
  return map;
}

async function getProfileAndCenterMaps(supabase: any, userIds: string[]) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, center_id, tenant_id")
    .in("user_id", userIds);
  const centerIds = [...new Set((profiles || []).map((p: any) => p.center_id).filter(Boolean))];
  const { data: centers } = centerIds.length
    ? await supabase.from("centers").select("id, name").in("id", centerIds)
    : { data: [] };
  const centerMap: Record<string, string> = {};
  for (const c of centers || []) centerMap[c.id] = c.name;
  const profileMap: Record<string, any> = {};
  for (const p of profiles || []) profileMap[p.user_id] = p;
  return { profileMap, centerMap };
}

async function processTrack(supabase: any, track: any) {
  if (!track.certificate_enabled || !track.instructor_name) {
    return { issued: 0, skipped: true, reason: !track.instructor_name ? "no instructor" : "disabled" };
  }
  const { data: assignments } = await supabase
    .from("staff_track_assignments")
    .select("user_id")
    .eq("track_id", track.id);
  if (!assignments?.length) return { issued: 0 };

  const { data: existing } = await supabase
    .from("track_certificates")
    .select("user_id")
    .eq("track_id", track.id);
  const existingSet = new Set((existing || []).map((c: any) => c.user_id));
  const candidates = assignments.map((a: any) => a.user_id).filter((u: string) => !existingSet.has(u));
  if (!candidates.length) return { issued: 0 };

  const { data: modules } = await supabase
    .from("modules")
    .select(`id, videos(id, is_required, duration_seconds), quizzes(id, is_required), homework_assignments(id, is_required), module_presentations(id, is_required), module_documents(id, is_required), module_lessons(id, is_required)`)
    .eq("track_id", track.id)
    .eq("is_active", true);
  if (!modules?.length) return { issued: 0 };

  let totalSeconds = 0;
  const required: RequiredItem[] = [];
  for (const m of modules) {
    for (const v of m.videos || []) {
      if (v.duration_seconds) totalSeconds += v.duration_seconds;
      if (v.is_required) required.push({ type: "video", id: v.id });
    }
    for (const q of m.quizzes || []) if (q.is_required) required.push({ type: "quiz", id: q.id });
    for (const h of m.homework_assignments || []) if (h.is_required) required.push({ type: "homework", id: h.id });
    for (const p of m.module_presentations || []) if (p.is_required) required.push({ type: "presentation", id: p.id });
    for (const d of m.module_documents || []) if (d.is_required) required.push({ type: "document", id: d.id });
    for (const l of m.module_lessons || []) if (l.is_required) required.push({ type: "lesson", id: l.id });
  }
  if (!required.length) return { issued: 0 };

  const hours = Math.round((totalSeconds / 3600) * 10) / 10;
  const completions = await getCompletionsByUser(supabase, required, candidates);
  const done = candidates.filter((u: string) => required.every((it) => completions[u].has(`${it.type}:${it.id}`)));
  if (!done.length) return { issued: 0 };

  const { profileMap, centerMap } = await getProfileAndCenterMaps(supabase, done);
  const rows = done
    .map((uid: string) => {
      const p = profileMap[uid];
      if (!p) return null;
      return {
        user_id: uid,
        track_id: track.id,
        staff_name: p.full_name,
        center_name: p.center_id ? centerMap[p.center_id] || "N/A" : "N/A",
        instructor_name: track.instructor_name,
        track_title: track.title,
        hours_earned: hours,
        tenant_id: track.tenant_id,
      };
    })
    .filter(Boolean);

  if (!rows.length) return { issued: 0 };
  const { error } = await supabase.from("track_certificates").insert(rows);
  if (error) throw error;
  return { issued: rows.length };
}

async function processModule(supabase: any, mod: any, trackTitle: string) {
  if (!mod.certificate_enabled || !mod.instructor_name) {
    return { issued: 0, skipped: true };
  }
  // Eligible users = anyone assigned to the parent track
  const { data: assignments } = await supabase
    .from("staff_track_assignments")
    .select("user_id")
    .eq("track_id", mod.track_id);
  if (!assignments?.length) return { issued: 0 };

  const { data: existing } = await supabase
    .from("module_certificates")
    .select("user_id")
    .eq("module_id", mod.id);
  const existingSet = new Set((existing || []).map((c: any) => c.user_id));
  const candidates = assignments.map((a: any) => a.user_id).filter((u: string) => !existingSet.has(u));
  if (!candidates.length) return { issued: 0 };

  // Fetch this module's content
  const [{ data: videos }, { data: quizzes }, { data: hw }, { data: pres }, { data: docs }, { data: lessons }] = await Promise.all([
    supabase.from("videos").select("id, is_required, duration_seconds").eq("module_id", mod.id),
    supabase.from("quizzes").select("id, is_required").eq("module_id", mod.id),
    supabase.from("homework_assignments").select("id, is_required").eq("module_id", mod.id),
    supabase.from("module_presentations").select("id, is_required").eq("module_id", mod.id),
    supabase.from("module_documents").select("id, is_required").eq("module_id", mod.id),
    supabase.from("module_lessons").select("id, is_required").eq("module_id", mod.id),
  ]);

  let totalSeconds = 0;
  const required: RequiredItem[] = [];
  for (const v of videos || []) {
    if (v.duration_seconds) totalSeconds += v.duration_seconds;
    if (v.is_required) required.push({ type: "video", id: v.id });
  }
  for (const q of quizzes || []) if (q.is_required) required.push({ type: "quiz", id: q.id });
  for (const h of hw || []) if (h.is_required) required.push({ type: "homework", id: h.id });
  for (const p of pres || []) if (p.is_required) required.push({ type: "presentation", id: p.id });
  for (const d of docs || []) if (d.is_required) required.push({ type: "document", id: d.id });
  for (const l of lessons || []) if (l.is_required) required.push({ type: "lesson", id: l.id });
  if (!required.length) return { issued: 0 };

  const hours = mod.course_hours ?? Math.round((totalSeconds / 3600) * 10) / 10;
  const completions = await getCompletionsByUser(supabase, required, candidates);
  const done = candidates.filter((u: string) => required.every((it) => completions[u].has(`${it.type}:${it.id}`)));
  if (!done.length) return { issued: 0 };

  const { profileMap, centerMap } = await getProfileAndCenterMaps(supabase, done);
  const rows = done
    .map((uid: string) => {
      const p = profileMap[uid];
      if (!p) return null;
      return {
        user_id: uid,
        module_id: mod.id,
        track_id: mod.track_id,
        staff_name: p.full_name,
        center_name: p.center_id ? centerMap[p.center_id] || "N/A" : "N/A",
        instructor_name: mod.instructor_name,
        module_title: mod.certificate_title || mod.title,
        track_title: trackTitle,
        hours_earned: hours,
        tenant_id: mod.tenant_id,
      };
    })
    .filter(Boolean);

  if (!rows.length) return { issued: 0 };
  const { error } = await supabase.from("module_certificates").insert(rows);
  if (error) throw error;
  return { issued: rows.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { track_id, tenant_id } = body || {};

    let tracks: any[] = [];
    let modules: any[] = [];

    if (track_id) {
      const { data: t } = await supabase.from("training_tracks").select("*").eq("id", track_id).single();
      if (t) tracks = [t];
      const { data: ms } = await supabase.from("modules").select("*").eq("track_id", track_id).eq("is_active", true);
      modules = ms || [];
    } else if (tenant_id) {
      const { data: ts } = await supabase.from("training_tracks").select("*").eq("tenant_id", tenant_id).eq("certificate_enabled", true);
      tracks = ts || [];
      const { data: ms } = await supabase.from("modules").select("*").eq("tenant_id", tenant_id).eq("is_active", true).eq("certificate_enabled", true);
      modules = ms || [];
    } else {
      return new Response(JSON.stringify({ error: "track_id or tenant_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const trackTitleMap: Record<string, string> = {};
    for (const t of tracks) trackTitleMap[t.id] = t.title;
    // For modules whose track wasn't in the tracks list, fetch titles
    const missingTrackIds = [...new Set(modules.map((m) => m.track_id).filter((id) => id && !trackTitleMap[id]))];
    if (missingTrackIds.length) {
      const { data: extra } = await supabase.from("training_tracks").select("id, title").in("id", missingTrackIds);
      for (const t of extra || []) trackTitleMap[t.id] = t.title;
    }

    let trackIssued = 0;
    const trackResults: any[] = [];
    for (const t of tracks) {
      try {
        const r = await processTrack(supabase, t);
        trackIssued += r.issued || 0;
        trackResults.push({ track: t.title, ...r });
      } catch (e) {
        trackResults.push({ track: t.title, error: (e as Error).message });
      }
    }

    let moduleIssued = 0;
    const moduleResults: any[] = [];
    for (const m of modules) {
      try {
        const r = await processModule(supabase, m, trackTitleMap[m.track_id] || "");
        moduleIssued += r.issued || 0;
        moduleResults.push({ module: m.title, ...r });
      } catch (e) {
        moduleResults.push({ module: m.title, error: (e as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        issued: trackIssued + moduleIssued,
        track_issued: trackIssued,
        module_issued: moduleIssued,
        tracks: trackResults,
        modules: moduleResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
