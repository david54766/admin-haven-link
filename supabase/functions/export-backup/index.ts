import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TABLES_TO_BACKUP = [
  'profiles', 'user_roles', 'centers', 'training_tracks', 'modules',
  'videos', 'quizzes', 'quiz_questions', 'homework_assignments',
  'homework_submissions', 'video_progress', 'quiz_attempts',
  'module_presentations', 'module_documents', 'presentation_progress',
  'document_progress', 'module_external_trainings', 'external_training_submissions',
  'module_lessons', 'lesson_pages', 'lesson_progress',
  'staff_track_assignments', 'track_certificates', 'module_certificates',
  'staff_certificates', 'staff_hours_log', 'staff_training_goals',
  'staff_documents', 'document_types', 'self_reflections', 'reflection_responses',
  'shared_resources', 'admin_announcements', 'checklist_templates',
  'checklist_items', 'checklist_submissions', 'checklist_submission_items',
  'calendar_events', 'expenses', 'positions', 'track_position_assignments',
  'system_settings', 'certificate_templates', 'application_form_fields',
  'application_notification_recipients', 'important_document_submissions',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Export each table
    const backup: Record<string, any[]> = {};
    const errors: string[] = [];

    for (const table of TABLES_TO_BACKUP) {
      try {
        let allData: any[] = [];
        let from = 0;
        const pageSize = 1000;

        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(from, from + pageSize - 1);

          if (error) {
            errors.push(`${table}: ${error.message}`);
            break;
          }

          if (!data || data.length === 0) break;
          allData = allData.concat(data);
          if (data.length < pageSize) break;
          from += pageSize;
        }

        backup[table] = allData;
      } catch (e) {
        errors.push(`${table}: ${e.message}`);
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const content = JSON.stringify({ timestamp: new Date().toISOString(), tables: backup, errors }, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(fileName, blob, { contentType: 'application/json' });

    if (uploadError) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalRecords = Object.values(backup).reduce((sum, arr) => sum + arr.length, 0);

    return new Response(JSON.stringify({
      success: true,
      fileName,
      totalTables: Object.keys(backup).length,
      totalRecords,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
