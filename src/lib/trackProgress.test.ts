import { describe, expect, it } from 'vitest';
import { computeTrackProgress, type ProgressInputs } from './trackProgress';

describe('shared staff and admin completion', () => {
  it('reports 20 of 21 as 95% until the required CACFP document is completed', () => {
    const videos = Array.from({ length: 20 }, (_, i) => ({ id: `video-${i}`, title: `Video ${i}`, is_required: true }));
    const modules = [{ title: 'Onboarding', is_active: true, videos, module_documents: [{ id: 'cacfp', title: 'CACFP Provider Training Guide', is_required: true }] }];
    const inputs: ProgressInputs = {
      videoProgress: videos.map((v) => ({ video_id: v.id, completed_at: '2026-11-05' })),
      documentProgress: [], presentationProgress: [], lessonProgress: [], quizAttempts: [], homeworkSubmissions: [], externalSubmissions: [],
    };
    const incomplete = computeTrackProgress(modules, inputs);
    expect(incomplete).toMatchObject({ total: 21, completed: 20, percent: 95 });
    expect(incomplete.missing).toEqual([{ module: 'Onboarding', title: 'CACFP Provider Training Guide', type: 'Document', pendingReview: false }]);
    expect(computeTrackProgress(modules, { ...inputs, documentProgress: [{ document_id: 'cacfp', completed_at: '2026-11-05' }] })).toMatchObject({ total: 21, completed: 21, percent: 100 });
  });
});