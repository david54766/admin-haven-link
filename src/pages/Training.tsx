import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, BookOpen, PlayCircle, FileText, Award } from 'lucide-react';
import { StaffTrackAssignment, TrainingTrack, Module, Video, Quiz, HomeworkAssignment, VideoProgress, QuizAttempt, HomeworkSubmission } from '@/types/database';
import { PendingHomeworkList } from '@/components/training/PendingHomeworkList';

interface TrackCertificateData {
  id: string;
  staff_name: string;
  center_name: string;
  instructor_name: string;
  track_title: string;
  hours_earned: number;
  issued_at: string;
  certificate_number: string;
}

interface TrackWithModules extends TrainingTrack {
  modules: (Module & {
    track?: TrainingTrack;
    videos: Video[];
    quizzes: Quiz[];
    homework_assignments: HomeworkAssignment[];
  })[];
}

interface HomeworkWithDetails extends HomeworkAssignment {
  module?: Module & { track?: TrainingTrack };
  submission?: HomeworkSubmission;
}

export default function Training() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'homework' ? 'homework' : tabParam === 'certificates' ? 'certificates' : 'tracks';
  const [assignments, setAssignments] = useState<StaffTrackAssignment[]>([]);
  const [trackProgress, setTrackProgress] = useState<Record<string, number>>({});
  const [allHomework, setAllHomework] = useState<HomeworkWithDetails[]>([]);
  const [certificates, setCertificates] = useState<TrackCertificateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrainingData();
      backfillCertificates();
    }
  }, [user]);

  // Auto-issue any certificates for tracks/modules the user has already completed.
  // Runs once per session; safe to re-run (server skips users who already have certs).
  const backfillCertificates = async () => {
    if (!user) return;
    const key = `retroactive-certs-run:${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    try {
      const { error } = await supabase.functions.invoke('issue-retroactive-certificates', {
        body: {},
      });
      if (error) {
        console.error('Retroactive cert backfill error:', error);
        return;
      }
      // Refresh certificates list so newly-issued ones appear
      const { data: certsData } = await supabase
        .from('track_certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });
      if (certsData) setCertificates(certsData as TrackCertificateData[]);
    } catch (e) {
      console.error('Retroactive cert backfill failed:', e);
    }
  };


  const fetchTrainingData = async () => {
    try {
      // Fetch assigned tracks with modules and content
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('staff_track_assignments')
        .select(`
          *,
          track:training_tracks(
            *,
            modules(
              *,
              videos(*),
              quizzes(*),
              homework_assignments(*)
            )
          )
        `)
        .eq('user_id', user!.id);

      if (assignmentsError) throw assignmentsError;

      const typedAssignments = (assignmentsData || []) as StaffTrackAssignment[];
      setAssignments(typedAssignments);

      // Build homework list with details
      const homeworkList: HomeworkWithDetails[] = [];
      for (const assignment of typedAssignments) {
        const track = assignment.track as TrackWithModules;
        if (track?.modules) {
          for (const module of track.modules) {
            for (const hw of module.homework_assignments || []) {
              homeworkList.push({
                ...hw,
                module: { ...module, track },
              });
            }
          }
        }
      }

      // Fetch user's progress data
      const [videoRes, quizRes, homeworkRes] = await Promise.all([
        supabase.from('video_progress').select('*').eq('user_id', user!.id),
        supabase.from('quiz_attempts').select('*').eq('user_id', user!.id),
        supabase.from('homework_submissions').select('*').eq('user_id', user!.id),
      ]);

      const videoProgressData = (videoRes.data || []) as VideoProgress[];
      const quizAttemptsData = (quizRes.data || []) as QuizAttempt[];
      const homeworkSubmissionsData = (homeworkRes.data || []) as HomeworkSubmission[];

      // Attach submissions to homework list
      const homeworkWithSubmissions = homeworkList.map(hw => ({
        ...hw,
        submission: homeworkSubmissionsData.find(s => s.homework_id === hw.id),
      }));
      
      // Sort: not started first, then pending review, then needs revision, then approved
      homeworkWithSubmissions.sort((a, b) => {
        const statusOrder = (hw: HomeworkWithDetails) => {
          if (!hw.submission) return 0;
          if (hw.submission.reviewed_status === 'pending') return 1;
          if (hw.submission.reviewed_status === 'needs_revision') return 2;
          if (hw.submission.reviewed_status === 'rejected') return 3;
          return 4; // approved
        };
        return statusOrder(a) - statusOrder(b);
      });
      
      setAllHomework(homeworkWithSubmissions);

      // Fetch certificates
      const { data: certsData } = await supabase
        .from('track_certificates')
        .select('*')
        .eq('user_id', user!.id)
        .order('issued_at', { ascending: false });
      setCertificates((certsData || []) as TrackCertificateData[]);

      // Calculate progress for each track
      const progress: Record<string, number> = {};
      for (const assignment of typedAssignments) {
        const track = assignment.track as TrackWithModules;
        if (!track?.modules) {
          progress[assignment.track_id] = 0;
          continue;
        }

        let totalItems = 0;
        let completedItems = 0;

        track.modules.forEach((module) => {
          // Count required videos
          const requiredVideos = module.videos?.filter((v) => v.is_required) || [];
          totalItems += requiredVideos.length;
          requiredVideos.forEach((video) => {
            const vp = videoProgressData.find((p) => p.video_id === video.id);
            if (vp?.completed_at) completedItems++;
          });

          // Count required quizzes
          const requiredQuizzes = module.quizzes?.filter((q) => q.is_required) || [];
          totalItems += requiredQuizzes.length;
          requiredQuizzes.forEach((quiz) => {
            const passed = quizAttemptsData.some((qa) => qa.quiz_id === quiz.id && qa.passed);
            if (passed) completedItems++;
          });

          // Count required homework
          const requiredHomework = module.homework_assignments?.filter((h) => h.is_required) || [];
          totalItems += requiredHomework.length;
          requiredHomework.forEach((hw) => {
            const approved = homeworkSubmissionsData.some(
              (hs) => hs.homework_id === hw.id && hs.reviewed_status === 'approved'
            );
            if (approved) completedItems++;
          });
        });

        progress[assignment.track_id] = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      }
      setTrackProgress(progress);
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cardColors = [
    { border: 'border-brand-blue/30', bg: 'bg-brand-blue/5', icon: 'text-brand-blue' },
    { border: 'border-brand-purple/30', bg: 'bg-brand-purple/5', icon: 'text-brand-purple' },
    { border: 'border-brand-green/30', bg: 'bg-brand-green/5', icon: 'text-brand-green' },
    { border: 'border-brand-red/30', bg: 'bg-brand-red/5', icon: 'text-brand-red' },
    { border: 'border-brand-yellow/30', bg: 'bg-brand-yellow/5', icon: 'text-brand-yellow' },
    { border: 'border-brand-orange/30', bg: 'bg-brand-orange/5', icon: 'text-brand-orange' },
  ];

  const pendingHomeworkCount = allHomework.filter(
    hw => !hw.submission || hw.submission.reviewed_status !== 'approved'
  ).length;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50">
              <GraduationCap className="h-3 w-3 text-brand-purple" />
              <span className="text-xs font-medium text-foreground">Learning Center</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Training</h1>
          <p className="text-muted-foreground mt-1">
            Complete your assigned training tracks to stay compliant and grow professionally.
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 h-auto">
            <TabsTrigger value="tracks" className="gap-1 text-xs sm:text-sm py-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Tracks</span>
            </TabsTrigger>
            <TabsTrigger value="homework" className="gap-1 text-xs sm:text-sm py-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Homework</span>
              {pendingHomeworkCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] p-0 justify-center text-xs">
                  {pendingHomeworkCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-1 text-xs sm:text-sm py-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Certs</span>
              {certificates.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] p-0 justify-center text-xs">
                  {certificates.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="mt-6">
            {isLoading ? (
              <p className="text-muted-foreground">Loading training tracks...</p>
            ) : assignments.length === 0 ? (
              <Card className="border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-brand-yellow/20 flex items-center justify-center mb-6">
                    <GraduationCap className="h-10 w-10 text-brand-yellow" />
                  </div>
                  <h2 className="text-xl font-semibold">No Training Assigned</h2>
                  <p className="mt-2 text-center text-muted-foreground max-w-md">
                    You don't have any training tracks assigned yet. Check back later or contact your administrator.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...assignments].sort((a, b) => {
                  const aTrack = a.track as TrainingTrack;
                  const bTrack = b.track as TrainingTrack;
                  const aPriority = (aTrack as any)?.is_priority ? 0 : 1;
                  const bPriority = (bTrack as any)?.is_priority ? 0 : 1;
                  if (aPriority !== bPriority) return aPriority - bPriority;
                  return (aTrack?.order_index || 0) - (bTrack?.order_index || 0);
                }).map((assignment, index) => {
                  const track = assignment.track as TrainingTrack;
                  const moduleCount = (track?.modules as Module[])?.length || 0;
                  const progress = trackProgress[assignment.track_id] || 0;
                  const colors = cardColors[index % cardColors.length];

                  return (
                    <Card key={assignment.id} className={`flex flex-col border-2 ${colors.border} ${colors.bg} hover:shadow-xl transition-all duration-300`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className={`p-3 rounded-xl bg-background shadow-sm`}>
                            <BookOpen className={`h-6 w-6 ${colors.icon}`} />
                          </div>
                          <Badge 
                            variant={progress === 100 ? 'default' : 'secondary'}
                            className={progress === 100 ? 'bg-brand-green text-white' : ''}
                          >
                            {progress === 100 ? 'Completed' : 'In Progress'}
                          </Badge>
                        </div>
                        <CardTitle className="mt-4 text-foreground flex items-center gap-2">
                          {track?.title}
                          {(track as any)?.is_priority && (
                            <Badge variant="destructive" className="text-xs">Priority</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{track?.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-4">
                          <div>
                            <div className="mb-2 flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium text-foreground">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <PlayCircle className="h-4 w-4" />
                              <span>{moduleCount} modules</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <div className="p-6 pt-0">
                        <Button asChild className="w-full bg-primary hover:bg-primary/90 shadow-md shadow-primary/25">
                          <Link to={`/training/${assignment.track_id}`}>
                            {progress === 0 ? 'Start Training' : 'Continue'}
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="homework" className="mt-6">
            <PendingHomeworkList homework={allHomework} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="certificates" className="mt-6">
            {isLoading ? (
              <p className="text-muted-foreground">Loading certificates...</p>
            ) : certificates.length === 0 ? (
              <Card className="border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Award className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">No Certificates Yet</h2>
                  <p className="mt-2 text-center text-muted-foreground max-w-md">
                    Complete your assigned training tracks to earn certificates.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert) => {
                  const issuedDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                  return (
                    <Card key={cert.id} className="border-2 border-primary/20 hover:shadow-lg transition-all duration-300">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="p-3 rounded-xl bg-primary/10 shadow-sm">
                            <Award className="h-6 w-6 text-primary" />
                          </div>
                          <Badge className="bg-brand-green text-white">Earned</Badge>
                        </div>
                        <CardTitle className="mt-4 text-foreground">{cert.track_title}</CardTitle>
                        <CardDescription>
                          Completed on {issuedDate}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>Instructor: <span className="font-medium text-foreground">{cert.instructor_name}</span></p>
                          <p>Center: <span className="font-medium text-foreground">{cert.center_name}</span></p>
                          <p>Hours: <span className="font-medium text-foreground">{cert.hours_earned}</span></p>
                          <p className="text-xs">Certificate #{cert.certificate_number}</p>
                        </div>
                      </CardContent>
                      <div className="p-6 pt-0">
                        <Button asChild className="w-full bg-primary hover:bg-primary/90 shadow-md shadow-primary/25">
                          <Link to={`/certificate/${cert.id}`}>View Certificate</Link>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
