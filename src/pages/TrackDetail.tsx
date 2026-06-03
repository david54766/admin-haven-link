import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, PlayCircle, FileQuestion, FileText, CheckCircle, Circle, Clock, Presentation, File, Award, ExternalLink, Upload, BookOpen, Download } from 'lucide-react';
import { TrainingTrack, Module, Video, Quiz, HomeworkAssignment, VideoProgress, QuizAttempt, HomeworkSubmission, ModulePresentation, ModuleDocument, PresentationProgress, DocumentProgress, ModuleExternalTraining, ExternalTrainingSubmission, ModuleLesson, LessonProgress } from '@/types/database';
import { DocumentViewer } from '@/components/training/DocumentViewer';
import { PresentationViewer } from '@/components/training/PresentationViewer';
import { ExternalTrainingItem } from '@/components/training/ExternalTrainingItem';
import { LessonViewer } from '@/components/training/LessonViewer';
import { useTrackCompletionNotification } from '@/hooks/useTrackCompletionNotification';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function TrackDetail() {
  const { trackId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendCompletionNotification } = useTrackCompletionNotification();
  const [track, setTrack] = useState<TrainingTrack | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [videoProgress, setVideoProgress] = useState<Record<string, VideoProgress>>({});
  const [quizAttempts, setQuizAttempts] = useState<Record<string, QuizAttempt[]>>({});
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<Record<string, HomeworkSubmission[]>>({});
  const [presentationProgress, setPresentationProgress] = useState<Record<string, PresentationProgress>>({});
  const [documentProgress, setDocumentProgress] = useState<Record<string, DocumentProgress>>({});
  const [externalTrainingSubmissions, setExternalTrainingSubmissions] = useState<Record<string, ExternalTrainingSubmission[]>>({});
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, LessonProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [existingCertificateId, setExistingCertificateId] = useState<string | null>(null);
  const [showCertDialog, setShowCertDialog] = useState(false);
  const previouslyCompletedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (trackId && user) {
      fetchTrackData();
    }
  }, [trackId, user]);

  const fetchTrackData = async () => {
    try {
      // Fetch track with modules and content
      const { data: trackData, error: trackError } = await supabase
        .from('training_tracks')
        .select(`
          *,
          modules(
            *,
            videos(*),
            quizzes(*),
            homework_assignments(*),
            module_presentations(*),
            module_documents(*),
            module_external_trainings(*),
            module_lessons(*)
          )
        `)
        .eq('id', trackId)
        .single();

      if (trackError) throw trackError;

      setTrack(trackData as TrainingTrack);
      setModules(((trackData as TrainingTrack)?.modules || []).sort((a, b) => a.order_index - b.order_index) as Module[]);

      // Fetch user's progress and existing certificate
      const [videoRes, quizRes, homeworkRes, presentationRes, documentRes, certRes, extTrainingRes, lessonProgressRes] = await Promise.all([
        supabase.from('video_progress').select('*').eq('user_id', user!.id),
        supabase.from('quiz_attempts').select('*').eq('user_id', user!.id),
        supabase.from('homework_submissions').select('*').eq('user_id', user!.id),
        supabase.from('presentation_progress').select('*').eq('user_id', user!.id),
        supabase.from('document_progress').select('*').eq('user_id', user!.id),
        supabase.from('track_certificates').select('id').eq('user_id', user!.id).eq('track_id', trackId!).maybeSingle(),
        supabase.from('external_training_submissions').select('*').eq('user_id', user!.id),
        supabase.from('lesson_progress').select('*').eq('user_id', user!.id),
      ]);

      if (certRes.data) {
        setExistingCertificateId(certRes.data.id);
      }

      // Index progress by video/quiz/homework ID
      const videoProgressMap: Record<string, VideoProgress> = {};
      for (const vp of (videoRes.data || []) as VideoProgress[]) {
        videoProgressMap[vp.video_id] = vp;
      }
      setVideoProgress(videoProgressMap);

      const quizAttemptsMap: Record<string, QuizAttempt[]> = {};
      for (const qa of (quizRes.data || []) as QuizAttempt[]) {
        if (!quizAttemptsMap[qa.quiz_id]) {
          quizAttemptsMap[qa.quiz_id] = [];
        }
        quizAttemptsMap[qa.quiz_id].push(qa);
      }
      setQuizAttempts(quizAttemptsMap);

      const homeworkSubmissionsMap: Record<string, HomeworkSubmission[]> = {};
      for (const hs of (homeworkRes.data || []) as HomeworkSubmission[]) {
        if (!homeworkSubmissionsMap[hs.homework_id]) {
          homeworkSubmissionsMap[hs.homework_id] = [];
        }
        homeworkSubmissionsMap[hs.homework_id].push(hs);
      }
      setHomeworkSubmissions(homeworkSubmissionsMap);

      // Index presentation progress
      const presentationProgressMap: Record<string, PresentationProgress> = {};
      for (const pp of (presentationRes.data || []) as PresentationProgress[]) {
        presentationProgressMap[pp.presentation_id] = pp;
      }
      setPresentationProgress(presentationProgressMap);

      // Index document progress
      const documentProgressMap: Record<string, DocumentProgress> = {};
      for (const dp of (documentRes.data || []) as DocumentProgress[]) {
        documentProgressMap[dp.document_id] = dp;
      }
      setDocumentProgress(documentProgressMap);

      // Index external training submissions
      const extTrainingMap: Record<string, ExternalTrainingSubmission[]> = {};
      for (const ets of (extTrainingRes.data || []) as ExternalTrainingSubmission[]) {
        if (!extTrainingMap[ets.external_training_id]) {
          extTrainingMap[ets.external_training_id] = [];
        }
        extTrainingMap[ets.external_training_id].push(ets);
      }
      setExternalTrainingSubmissions(extTrainingMap);

      // Index lesson progress
      const lessonProgMap: Record<string, LessonProgress> = {};
      for (const lp of (lessonProgressRes.data || []) as LessonProgress[]) {
        lessonProgMap[lp.lesson_id] = lp;
      }
      setLessonProgressMap(lessonProgMap);
    } catch (error) {
      console.error('Error fetching track data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoStatus = (video: Video) => {
    const progress = videoProgress[video.id];
    if (!progress) return 'not_started';
    if (progress.completed_at) return 'completed';
    return 'in_progress';
  };

  const getQuizStatus = (quiz: Quiz) => {
    const attempts = quizAttempts[quiz.id] || [];
    if (attempts.length === 0) return 'not_started';
    if (attempts.some((a) => a.passed)) return 'passed';
    return 'attempted';
  };

  const getHomeworkStatus = (homework: HomeworkAssignment) => {
    const submissions = homeworkSubmissions[homework.id] || [];
    if (submissions.length === 0) return 'not_started';
    const latest = submissions[submissions.length - 1];
    return latest.reviewed_status;
  };

  // Calculate overall track progress
  const calculateTrackProgress = () => {
    let totalItems = 0;
    let completedItems = 0;

    const stats = {
      videos: { total: 0, completed: 0 },
      quizzes: { total: 0, completed: 0 },
      homework: { total: 0, completed: 0 },
      presentations: { total: 0, completed: 0 },
      documents: { total: 0, completed: 0 },
      externalTrainings: { total: 0, completed: 0 },
      lessons: { total: 0, completed: 0 },
    };

    modules.forEach((module) => {
      const videos = ((module as any).videos || []) as Video[];
      const quizzes = ((module as any).quizzes || []) as Quiz[];
      const homework = ((module as any).homework_assignments || []) as HomeworkAssignment[];
      const presentations = ((module as any).module_presentations || []) as ModulePresentation[];
      const documents = ((module as any).module_documents || []) as ModuleDocument[];
      const externalTrainings = ((module as any).module_external_trainings || []) as ModuleExternalTraining[];
      const lessons = ((module as any).module_lessons || []) as ModuleLesson[];

      // Count videos
      videos.forEach((video) => {
        if (video.is_required) {
          stats.videos.total++;
          totalItems++;
          if (videoProgress[video.id]?.completed_at) {
            stats.videos.completed++;
            completedItems++;
          }
        }
      });

      // Count quizzes
      quizzes.forEach((quiz) => {
        if (quiz.is_required) {
          stats.quizzes.total++;
          totalItems++;
          const attempts = quizAttempts[quiz.id] || [];
          if (attempts.some((a) => a.passed)) {
            stats.quizzes.completed++;
            completedItems++;
          }
        }
      });

      // Count homework
      homework.forEach((hw) => {
        if (hw.is_required) {
          stats.homework.total++;
          totalItems++;
          const submissions = homeworkSubmissions[hw.id] || [];
          if (submissions.some((s) => s.reviewed_status === 'approved')) {
            stats.homework.completed++;
            completedItems++;
          }
        }
      });

      // Count presentations
      presentations.forEach((pres) => {
        if (pres.is_required) {
          stats.presentations.total++;
          totalItems++;
          if (presentationProgress[pres.id]?.completed_at) {
            stats.presentations.completed++;
            completedItems++;
          }
        }
      });

      // Count documents
      documents.forEach((doc) => {
        if (doc.is_required) {
          stats.documents.total++;
          totalItems++;
          if (documentProgress[doc.id]?.completed_at) {
            stats.documents.completed++;
            completedItems++;
          }
        }
      });
      // Count external trainings
      externalTrainings.forEach((et) => {
        if (et.is_required) {
          stats.externalTrainings.total++;
          totalItems++;
          const submissions = externalTrainingSubmissions[et.id] || [];
          const isComplete = et.requires_certificate
            ? submissions.some((s) => s.status === 'approved')
            : submissions.length > 0;
          if (isComplete) {
            stats.externalTrainings.completed++;
            completedItems++;
          }
        }
      });

      // Count lessons
      lessons.forEach((lesson) => {
        if (lesson.is_required) {
          stats.lessons.total++;
          totalItems++;
          if (lessonProgressMap[lesson.id]?.completed_at) {
            stats.lessons.completed++;
            completedItems++;
          }
        }
      });
    });

    const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return { percent, totalItems, completedItems, stats };
  };

  const trackProgress = calculateTrackProgress();

  // Issue certificate on completion
  const issueCertificate = async () => {
    if (!track || !user || existingCertificateId) return;
    
    const trackData = track as any;
    if (!trackData.certificate_enabled || !trackData.instructor_name) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, center_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      let centerName = 'N/A';
      if (profile.center_id) {
        const { data: center } = await supabase
          .from('centers')
          .select('name')
          .eq('id', profile.center_id)
          .single();
        if (center) centerName = center.name;
      }

      // Use course_hours from track if set, otherwise calculate from video durations
      let hoursEarned: number;
      if (trackData.course_hours) {
        hoursEarned = Number(trackData.course_hours);
      } else {
        let totalSeconds = 0;
        modules.forEach((module) => {
          const videos = ((module as any).videos || []) as Video[];
          videos.forEach((video) => {
            if (video.duration_seconds) totalSeconds += video.duration_seconds;
          });
        });
        hoursEarned = Math.round((totalSeconds / 3600) * 10) / 10;
      }

      // Check for expiry — use certificate_expiry_days from track first, then template expiry_months
      let expiryDate: string | null = null;
      if (trackData.certificate_expiry_days) {
        const d = new Date();
        d.setDate(d.getDate() + trackData.certificate_expiry_days);
        expiryDate = d.toISOString().split('T')[0];
      } else if (trackData.certificate_template_id) {
        const { data: tmpl } = await supabase
          .from('certificate_templates')
          .select('expiry_months')
          .eq('id', trackData.certificate_template_id)
          .single();
        if (tmpl?.expiry_months) {
          const d = new Date();
          d.setMonth(d.getMonth() + tmpl.expiry_months);
          expiryDate = d.toISOString().split('T')[0];
        }
      }

      const { data: cert, error } = await supabase
        .from('track_certificates')
        .insert({
          user_id: user.id,
          track_id: track.id,
          staff_name: profile.full_name,
          center_name: centerName,
          instructor_name: trackData.instructor_name,
          track_title: track.title,
          hours_earned: hoursEarned,
          expiry_date: expiryDate,
        })
        .select('id, certificate_number')
        .single();

      if (!error && cert) {
        setExistingCertificateId(cert.id);
        setShowCertDialog(true);

        // Auto-add to staff_certificates
        await supabase.from('staff_certificates').insert({
          user_id: user.id,
          title: `${track.title} - Completion Certificate`,
          issuing_organization: centerName,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate,
          hours: hoursEarned,
          certificate_number: cert.certificate_number,
          notes: `Auto-issued upon completing training track: ${track.title}`,
        });

        // Auto-add training hours
        await supabase.from('staff_hours_log').insert({
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          hours: hoursEarned,
          category: 'training',
          description: `Completed track: ${track.title}`,
        });
      }
    } catch (error) {
      console.error('Error issuing certificate:', error);
    }
  };

  // Effect to detect track completion and send notification
  useEffect(() => {
    if (!track || isLoading) return;

    const isCurrentlyComplete = trackProgress.percent === 100 && trackProgress.totalItems > 0;
    
    // Only send notification if:
    // 1. Track is now 100% complete
    // 2. We have tracked a previous state (not first load with already complete track)
    // 3. Previous state was not complete
    if (isCurrentlyComplete && previouslyCompletedRef.current === false) {
      sendCompletionNotification({
        trackId: track.id,
        trackTitle: track.title,
      });
    }

    // Issue certificate whenever the track is complete and no cert exists yet.
    // issueCertificate() guards on existingCertificateId, so re-runs are safe.
    if (isCurrentlyComplete && !existingCertificateId) {
      issueCertificate();
    }

    // Update the previous completion state
    previouslyCompletedRef.current = isCurrentlyComplete;
  }, [trackProgress.percent, track, isLoading, sendCompletionNotification]);

  if (isLoading) {
    return (
      <Layout>
        <p className="text-muted-foreground">Loading track...</p>
      </Layout>
    );
  }

  if (!track) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Track not found</p>
            <Button asChild className="mt-4">
              <Link to="/training">Back to Training</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/training">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{track.title}</h1>
            <p className="text-muted-foreground">{track.description}</p>
          </div>
        </div>

        {/* Track Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    trackProgress.percent === 100 ? 'bg-brand-green/20' : 'bg-primary/10'
                  }`}>
                    {trackProgress.percent === 100 ? (
                      <CheckCircle className="h-6 w-6 text-brand-green" />
                    ) : (
                      <span className="text-lg font-bold text-primary">{trackProgress.percent}%</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {trackProgress.percent === 100 ? 'Track Completed!' : 'Track Progress'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {trackProgress.completedItems} of {trackProgress.totalItems} items completed
                    </p>
                  </div>
                </div>
                {trackProgress.percent === 100 && (
                  <div className="flex items-center gap-2">
                    {existingCertificateId && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/certificate/${existingCertificateId}`}>
                          <Award className="mr-1 h-3 w-3" />
                          View Certificate
                        </Link>
                      </Button>
                    )}
                    <Badge variant="secondary" className="bg-brand-green/20 text-brand-green">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  </div>
                )}
              </div>
              <Progress value={trackProgress.percent} className="h-3" />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-2">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium">
                      {trackProgress.stats.videos.completed}/{trackProgress.stats.videos.total}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Videos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Presentation className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium">
                      {trackProgress.stats.presentations.completed}/{trackProgress.stats.presentations.total}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Slides</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <File className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium">
                      {trackProgress.stats.documents.completed}/{trackProgress.stats.documents.total}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Docs</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FileQuestion className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium">
                      {trackProgress.stats.quizzes.completed}/{trackProgress.stats.quizzes.total}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Quizzes</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium">
                      {trackProgress.stats.homework.completed}/{trackProgress.stats.homework.total}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">HW</p>
                </div>
                {trackProgress.stats.externalTrainings.total > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs sm:text-sm font-medium">
                        {trackProgress.stats.externalTrainings.completed}/{trackProgress.stats.externalTrainings.total}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">External</p>
                  </div>
                )}
                {trackProgress.stats.lessons.total > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs sm:text-sm font-medium">
                        {trackProgress.stats.lessons.completed}/{trackProgress.stats.lessons.total}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Lessons</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No modules in this track yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {modules.map((module, index) => {
              const videos = ((module as any).videos || []).sort((a: Video, b: Video) => a.order_index - b.order_index) as Video[];
              const quizzes = ((module as any).quizzes || []).sort((a: Quiz, b: Quiz) => a.order_index - b.order_index) as Quiz[];
              const homework = ((module as any).homework_assignments || []).sort((a: HomeworkAssignment, b: HomeworkAssignment) => a.order_index - b.order_index) as HomeworkAssignment[];
              const presentations = ((module as any).module_presentations || []).sort((a: ModulePresentation, b: ModulePresentation) => a.order_index - b.order_index) as ModulePresentation[];
              const documents = ((module as any).module_documents || []).sort((a: ModuleDocument, b: ModuleDocument) => a.order_index - b.order_index) as ModuleDocument[];
              const externalTrainings = ((module as any).module_external_trainings || []).sort((a: ModuleExternalTraining, b: ModuleExternalTraining) => a.order_index - b.order_index) as ModuleExternalTraining[];
              const lessons = ((module as any).module_lessons || []).sort((a: ModuleLesson, b: ModuleLesson) => a.order_index - b.order_index) as ModuleLesson[];

              return (
                <AccordionItem key={module.id} value={module.id} className="rounded-lg border">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                        {index + 1}
                      </span>
                      <div className="text-left">
                        <h3 className="font-medium">{module.title}</h3>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4">
                      {/* Videos */}
                      {videos.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">Videos</h4>
                          <div className="space-y-2">
                            {videos.map((video) => {
                              const status = getVideoStatus(video);
                              const progress = videoProgress[video.id];
                              return (
                                <div
                                  key={video.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {status === 'completed' ? (
                                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                                    ) : status === 'in_progress' ? (
                                      <Clock className="h-5 w-5 shrink-0 text-yellow-500" />
                                    ) : (
                                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{video.title}</p>
                                      {progress && progress.percent_complete > 0 && (
                                        <p className="text-sm text-muted-foreground">
                                          {progress.percent_complete}% complete
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <Button size="sm" asChild className="shrink-0 self-end sm:self-auto">
                                    <Link to={`/training/${trackId}/video/${video.id}`}>
                                      <PlayCircle className="mr-1 h-4 w-4" />
                                      {status === 'not_started' ? 'Watch' : 'Continue'}
                                    </Link>
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quizzes */}
                      {quizzes.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">Quizzes</h4>
                          <div className="space-y-2">
                            {quizzes.map((quiz) => {
                              const status = getQuizStatus(quiz);
                              const attempts = quizAttempts[quiz.id] || [];
                              return (
                                <div
                                  key={quiz.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {status === 'passed' ? (
                                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                                    ) : status === 'attempted' ? (
                                      <Clock className="h-5 w-5 shrink-0 text-yellow-500" />
                                    ) : (
                                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{quiz.title}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {attempts.length} attempt(s) • Pass: {quiz.passing_score}%
                                      </p>
                                    </div>
                                  </div>
                                  <Button size="sm" asChild className="shrink-0 self-end sm:self-auto">
                                    <Link to={`/training/${trackId}/quiz/${quiz.id}`}>
                                      <FileQuestion className="mr-1 h-4 w-4" />
                                      {status === 'not_started' ? 'Start' : 'Retry'}
                                    </Link>
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Homework */}
                      {homework.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">Homework</h4>
                          <div className="space-y-2">
                            {homework.map((hw) => {
                              const status = getHomeworkStatus(hw);
                              return (
                                <div
                                  key={hw.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {status === 'approved' ? (
                                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                                    ) : status !== 'not_started' ? (
                                      <Clock className="h-5 w-5 shrink-0 text-yellow-500" />
                                    ) : (
                                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{hw.title}</p>
                                      <p className="text-sm text-muted-foreground capitalize">
                                        Status: {status.replace('_', ' ')}
                                      </p>
                                    </div>
                                  </div>
                                  <Button size="sm" asChild className="shrink-0 self-end sm:self-auto">
                                    <Link to={`/training/${trackId}/homework/${hw.id}`}>
                                      <FileText className="mr-1 h-4 w-4" />
                                      {status === 'not_started' ? 'Submit' : 'View'}
                                    </Link>
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Presentations */}
                      {presentations.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">Presentations</h4>
                          <div className="space-y-2">
                            {presentations.map((presentation) => {
                              const isCompleted = !!presentationProgress[presentation.id]?.completed_at;
                              return (
                                <div
                                  key={presentation.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {isCompleted ? (
                                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                                    ) : (
                                      <Presentation className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{presentation.title}</p>
                                      {presentation.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                          {presentation.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                <PresentationViewer
                                  presentationId={presentation.id}
                                  title={presentation.title}
                                  fileUrl={presentation.file_url}
                                  fileName={presentation.file_name}
                                  isCompleted={!!presentationProgress[presentation.id]?.completed_at}
                                  allowMarkComplete={presentation.allow_mark_complete}
                                  allowDownload={presentation.allow_download}
                                  onComplete={fetchTrackData}
                                />
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Documents */}
                      {documents.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">Documents</h4>
                          <div className="space-y-2">
                            {documents.map((doc) => {
                              const isCompleted = !!documentProgress[doc.id]?.completed_at;
                              return (
                                <div
                                  key={doc.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {isCompleted ? (
                                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                                    ) : (
                                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{doc.title}</p>
                                      {doc.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                          {doc.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <DocumentViewer
                                    documentId={doc.id}
                                    title={doc.title}
                                    fileUrl={doc.file_url}
                                    fileName={doc.file_name}
                                    isCompleted={isCompleted}
                                    allowMarkComplete={doc.allow_mark_complete}
                                    allowDownload={doc.allow_download}
                                    onComplete={fetchTrackData}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* External Trainings */}
                      {externalTrainings.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">External Trainings</h4>
                          <div className="space-y-2">
                            {externalTrainings.map((et) => (
                              <ExternalTrainingItem
                                key={et.id}
                                training={et}
                                submissions={externalTrainingSubmissions[et.id] || []}
                                onUpdate={fetchTrackData}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lessons */}
                      {lessons.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">Lessons</h4>
                          <div className="space-y-2">
                            {lessons.map((lesson) => {
                              const isCompleted = !!lessonProgressMap[lesson.id]?.completed_at;
                              return (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {isCompleted ? (
                                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                                    ) : (
                                      <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{lesson.title}</p>
                                      {lesson.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                          {lesson.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <LessonViewer
                                    lessonId={lesson.id}
                                    title={lesson.title}
                                    isCompleted={isCompleted}
                                    onComplete={fetchTrackData}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Certificate completion dialog */}
      <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Congratulations! 🎉
            </DialogTitle>
            <DialogDescription>
              You've completed "{track?.title}"! Your certificate has been issued and your training hours have been recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            {existingCertificateId && (
              <>
                <Button asChild>
                  <Link to={`/certificate/${existingCertificateId}`}>
                    <Award className="mr-2 h-4 w-4" />
                    View & Download Certificate
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/certificates">
                    View Training Hours
                  </Link>
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setShowCertDialog(false)}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
