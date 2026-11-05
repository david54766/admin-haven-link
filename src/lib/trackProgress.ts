// Single source of truth for track completion, used by staff and admin pages
// so both always show the same percentage.

export interface ProgressInputs {
  videoProgress: { video_id: string; completed_at: string | null }[];
  presentationProgress: { presentation_id: string; completed_at: string | null }[];
  documentProgress: { document_id: string; completed_at: string | null }[];
  lessonProgress: { lesson_id: string; completed_at: string | null }[];
  quizAttempts: { quiz_id: string; passed: boolean }[];
  homeworkSubmissions: { homework_id: string; reviewed_status: string }[];
  externalSubmissions: { external_training_id: string | null; status: string }[];
}

export interface TrackProgressResult {
  total: number;
  completed: number;
  percent: number;
  missing: { module: string; title: string; type: string; pendingReview?: boolean }[];
}

/** Inputs must already be filtered to a single user. */
export function computeTrackProgress(modules: any[], p: ProgressInputs): TrackProgressResult {
  let total = 0;
  let completed = 0;
  const missing: TrackProgressResult['missing'] = [];

  const check = (module: any, items: any[] | undefined, type: string, done: (i: any) => boolean, pending?: (i: any) => boolean) => {
    (items || []).filter((i) => i.is_required).forEach((i) => {
      total++;
      if (done(i)) completed++;
      else missing.push({ module: module.title, title: i.title, type, pendingReview: pending ? pending(i) : false });
    });
  };

  for (const m of (modules || []).filter((m) => m.is_active !== false)) {
    check(m, m.videos, 'Video', (v) => p.videoProgress.some((x) => x.video_id === v.id && x.completed_at));
    check(m, m.module_presentations, 'Presentation', (v) => p.presentationProgress.some((x) => x.presentation_id === v.id && x.completed_at));
    check(m, m.module_documents, 'Document', (v) => p.documentProgress.some((x) => x.document_id === v.id && x.completed_at));
    check(m, m.module_lessons, 'Lesson', (v) => p.lessonProgress.some((x) => x.lesson_id === v.id && x.completed_at));
    check(m, m.quizzes, 'Quiz', (q) => p.quizAttempts.some((x) => x.quiz_id === q.id && x.passed));
    check(
      m, m.homework_assignments, 'Homework',
      (h) => p.homeworkSubmissions.some((x) => x.homework_id === h.id && x.reviewed_status === 'approved'),
      (h) => p.homeworkSubmissions.some((x) => x.homework_id === h.id && x.reviewed_status === 'pending'),
    );
    check(
      m, m.module_external_trainings, 'Outside course',
      (et) => {
        const subs = p.externalSubmissions.filter((x) => x.external_training_id === et.id);
        return et.requires_certificate ? subs.some((x) => x.status === 'approved') : subs.length > 0;
      },
      (et) => p.externalSubmissions.some((x) => x.external_training_id === et.id && x.status === 'pending'),
    );
  }

  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0, missing };
}
