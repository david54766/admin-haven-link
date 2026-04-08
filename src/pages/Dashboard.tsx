import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  PlayCircle,
  Sparkles,
  Trophy,
  Target,
} from 'lucide-react';
import { StaffTrackAssignment, VideoProgress, QuizAttempt, HomeworkSubmission, TrainingTrack, Module, Video, Quiz, HomeworkAssignment } from '@/types/database';
import { AnnouncementsBanner } from '@/components/dashboard/AnnouncementsBanner';

interface TrackWithModules extends TrainingTrack {
  modules: (Module & {
    videos: Video[];
    quizzes: Quiz[];
    homework_assignments: HomeworkAssignment[];
  })[];
}

interface TrackProgress {
  trackId: string;
  trackTitle: string;
  trackDescription: string | null;
  totalItems: number;
  completedItems: number;
  percent: number;
  videos: { completed: number; total: number };
  quizzes: { completed: number; total: number };
  homework: { completed: number; total: number };
}

export default function Dashboard() {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect admins to /admin on initial login, but allow toggling to staff view
  const routerLocation = useLocation();
  useEffect(() => {
    if (isAdmin && !routerLocation.state?.fromToggle) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, navigate, routerLocation.state]);
  const [assignments, setAssignments] = useState<StaffTrackAssignment[]>([]);
  const [tracksWithModules, setTracksWithModules] = useState<TrackWithModules[]>([]);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [assignmentsRes, videoRes, quizRes, homeworkRes] = await Promise.all([
        supabase
          .from('staff_track_assignments')
          .select('*, track:training_tracks(*)')
          .eq('user_id', user!.id),
        supabase
          .from('video_progress')
          .select('*')
          .eq('user_id', user!.id),
        supabase
          .from('quiz_attempts')
          .select('*, quiz:quizzes(*)')
          .eq('user_id', user!.id),
        supabase
          .from('homework_submissions')
          .select('*, homework_assignment:homework_assignments(*)')
          .eq('user_id', user!.id),
      ]);

      const assignmentsData = (assignmentsRes.data || []) as StaffTrackAssignment[];
      setAssignments(assignmentsData);
      setVideoProgress((videoRes.data || []) as VideoProgress[]);
      setQuizAttempts((quizRes.data || []) as QuizAttempt[]);
      setHomeworkSubmissions((homeworkRes.data || []) as HomeworkSubmission[]);

      // Fetch full track details with modules for progress calculation
      if (assignmentsData.length > 0) {
        const trackIds = assignmentsData.map(a => a.track_id);
        const { data: tracksData } = await supabase
          .from('training_tracks')
          .select(`
            *,
            modules(
              *,
              videos(*),
              quizzes(*),
              homework_assignments(*)
            )
          `)
          .in('id', trackIds);
        
        setTracksWithModules((tracksData || []) as TrackWithModules[]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate progress for each track
  const calculateTrackProgress = (): TrackProgress[] => {
    return tracksWithModules.map(track => {
      let totalVideos = 0;
      let completedVideos = 0;
      let totalQuizzes = 0;
      let completedQuizzes = 0;
      let totalHomework = 0;
      let completedHomework = 0;

      track.modules?.forEach(module => {
        // Count required videos
        const requiredVideos = module.videos?.filter(v => v.is_required) || [];
        totalVideos += requiredVideos.length;
        requiredVideos.forEach(video => {
          const progress = videoProgress.find(vp => vp.video_id === video.id);
          if (progress?.completed_at) completedVideos++;
        });

        // Count required quizzes
        const requiredQuizzes = module.quizzes?.filter(q => q.is_required) || [];
        totalQuizzes += requiredQuizzes.length;
        requiredQuizzes.forEach(quiz => {
          const passed = quizAttempts.some(qa => qa.quiz_id === quiz.id && qa.passed);
          if (passed) completedQuizzes++;
        });

        // Count required homework
        const requiredHomework = module.homework_assignments?.filter(h => h.is_required) || [];
        totalHomework += requiredHomework.length;
        requiredHomework.forEach(hw => {
          const approved = homeworkSubmissions.some(
            hs => hs.homework_id === hw.id && hs.reviewed_status === 'approved'
          );
          if (approved) completedHomework++;
        });
      });

      const totalItems = totalVideos + totalQuizzes + totalHomework;
      const completedItems = completedVideos + completedQuizzes + completedHomework;
      const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        trackId: track.id,
        trackTitle: track.title,
        trackDescription: track.description,
        totalItems,
        completedItems,
        percent,
        videos: { completed: completedVideos, total: totalVideos },
        quizzes: { completed: completedQuizzes, total: totalQuizzes },
        homework: { completed: completedHomework, total: totalHomework },
      };
    });
  };

  const trackProgressData = calculateTrackProgress();
  
  // Calculate overall progress
  const overallStats = trackProgressData.reduce(
    (acc, track) => ({
      totalItems: acc.totalItems + track.totalItems,
      completedItems: acc.completedItems + track.completedItems,
      videos: {
        completed: acc.videos.completed + track.videos.completed,
        total: acc.videos.total + track.videos.total,
      },
      quizzes: {
        completed: acc.quizzes.completed + track.quizzes.completed,
        total: acc.quizzes.total + track.quizzes.total,
      },
      homework: {
        completed: acc.homework.completed + track.homework.completed,
        total: acc.homework.total + track.homework.total,
      },
    }),
    {
      totalItems: 0,
      completedItems: 0,
      videos: { completed: 0, total: 0 },
      quizzes: { completed: 0, total: 0 },
      homework: { completed: 0, total: 0 },
    }
  );

  const overallPercent = overallStats.totalItems > 0 
    ? Math.round((overallStats.completedItems / overallStats.totalItems) * 100) 
    : 0;

  const completedVideos = videoProgress.filter((v) => v.completed_at).length;
  const passedQuizzes = quizAttempts.filter((q) => q.passed).length;
  const submittedHomework = homeworkSubmissions.length;
  const approvedHomework = homeworkSubmissions.filter((h) => h.reviewed_status === 'approved').length;

  const statCards = [
    {
      title: 'Assigned Tracks',
      value: assignments.length,
      description: 'Training tracks to complete',
      icon: BookOpen,
      color: 'brand-blue',
    },
    {
      title: 'Videos Completed',
      value: completedVideos,
      description: 'Training videos watched',
      icon: PlayCircle,
      color: 'brand-purple',
    },
    {
      title: 'Quizzes Passed',
      value: passedQuizzes,
      description: `Out of ${quizAttempts.length} attempts`,
      icon: CheckCircle,
      color: 'brand-green',
    },
    {
      title: 'Homework Approved',
      value: approvedHomework,
      description: `Out of ${submittedHomework} submitted`,
      icon: FileText,
      color: 'brand-yellow',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    'brand-blue': { bg: 'bg-brand-blue/10', text: 'text-brand-blue' },
    'brand-purple': { bg: 'bg-brand-purple/10', text: 'text-brand-purple' },
    'brand-green': { bg: 'bg-brand-green/10', text: 'text-brand-green' },
    'brand-yellow': { bg: 'bg-brand-yellow/20', text: 'text-brand-yellow' },
    'brand-red': { bg: 'bg-brand-red/10', text: 'text-brand-red' },
    'brand-orange': { bg: 'bg-brand-orange/10', text: 'text-brand-orange' },
  };

  const trackColors = [
    { border: 'border-brand-blue/30', bg: 'bg-brand-blue/5', progress: 'bg-brand-blue' },
    { border: 'border-brand-purple/30', bg: 'bg-brand-purple/5', progress: 'bg-brand-purple' },
    { border: 'border-brand-green/30', bg: 'bg-brand-green/5', progress: 'bg-brand-green' },
    { border: 'border-brand-red/30', bg: 'bg-brand-red/5', progress: 'bg-brand-red' },
    { border: 'border-brand-yellow/30', bg: 'bg-brand-yellow/5', progress: 'bg-brand-yellow' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50">
              <Sparkles className="h-3 w-3 text-brand-purple" />
              <span className="text-xs font-medium text-foreground">Welcome back</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Hello, <span className="bg-gradient-to-r from-brand-red via-brand-purple to-brand-blue bg-clip-text text-transparent">{profile?.full_name?.split(' ')[0]}</span>!
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your training progress and stay up to date with your assignments.
          </p>
        </div>

        {/* Admin Announcements */}
        <AnnouncementsBanner />

        {/* Priority Training Alert */}
        {(() => {
          const priorityTracks = tracksWithModules.filter(t => t.is_priority);
          const incompletePriority = priorityTracks.filter(t => {
            const tp = trackProgressData.find(p => p.trackId === t.id);
            return !tp || tp.percent < 100;
          });
          if (incompletePriority.length === 0) return null;
          return (
            <Card className="border-2 border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-start gap-4 py-4">
                <div className="p-2 rounded-lg bg-destructive/10 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">Priority Training Required</h3>
                  <p className="text-sm text-muted-foreground">
                    You have {incompletePriority.length} priority training track{incompletePriority.length > 1 ? 's' : ''} that need{incompletePriority.length === 1 ? 's' : ''} your attention.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {incompletePriority.map(track => (
                      <Button key={track.id} asChild size="sm" variant="destructive" className="h-7 text-xs">
                        <Link to={`/training/${track.id}`}>{track.title}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Overall Training Progress */}
        {assignments.length > 0 && (
          <Card className="border-2 bg-gradient-to-br from-brand-purple/5 via-background to-brand-blue/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-brand-yellow" />
                    Overall Training Progress
                  </CardTitle>
                  <CardDescription>Your progress across all assigned training tracks</CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${overallPercent === 100 ? 'text-brand-green' : 'text-foreground'}`}>
                    {overallPercent}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {overallStats.completedItems} of {overallStats.totalItems} items
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Progress Bar */}
              <div className="space-y-2">
                <Progress value={overallPercent} className="h-3" />
                <div className="flex flex-col sm:flex-row justify-between gap-2 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                      <PlayCircle className="h-4 w-4 text-brand-purple" />
                      {overallStats.videos.completed}/{overallStats.videos.total} Videos
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-brand-blue" />
                      {overallStats.quizzes.completed}/{overallStats.quizzes.total} Quizzes
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-brand-red" />
                      {overallStats.homework.completed}/{overallStats.homework.total} HW
                    </span>
                  </div>
                  {overallPercent === 100 && (
                    <Badge className="bg-brand-green text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      All Complete!
                    </Badge>
                  )}
                </div>
              </div>

              {/* Individual Track Progress */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Progress by Track</h4>
                <div className="grid gap-3">
                  {trackProgressData.map((track, index) => {
                    const colors = trackColors[index % trackColors.length];
                    return (
                      <Link
                        key={track.trackId}
                        to={`/training/${track.trackId}`}
                        className={`block rounded-xl border-2 p-4 transition-all hover:shadow-md ${colors.border} ${colors.bg}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                          <h5 className="font-medium text-foreground flex items-center gap-2">
                            {track.trackTitle}
                            {tracksWithModules.find(t => t.id === track.trackId)?.is_priority && (
                              <Badge variant="destructive" className="text-xs">Priority</Badge>
                            )}
                          </h5>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {track.trackDescription}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className={`text-lg font-bold ${track.percent === 100 ? 'text-brand-green' : 'text-foreground'}`}>
                                {track.percent}%
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {track.completedItems}/{track.totalItems}
                              </p>
                            </div>
                            {track.percent === 100 ? (
                              <CheckCircle className="h-6 w-6 text-brand-green" />
                            ) : (
                              <div className="h-10 w-10 rounded-full border-4 border-muted flex items-center justify-center">
                                <span className="text-xs font-medium">{track.percent}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Progress value={track.percent} className="h-2" />
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{track.videos.completed}/{track.videos.total} videos</span>
                          <span>{track.quizzes.completed}/{track.quizzes.total} quizzes</span>
                          <span>{track.homework.completed}/{track.homework.total} homework</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const colors = colorClasses[stat.color];
            return (
              <Card key={stat.title} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Assigned Tracks */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brand-red" />
              Your Training Tracks
            </CardTitle>
            <CardDescription>Continue where you left off</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : assignments.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-brand-yellow/20 flex items-center justify-center mb-4">
                  <GraduationCap className="h-8 w-8 text-brand-yellow" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Training Assigned Yet</h3>
                <p className="text-muted-foreground">
                  Check back soon! Your administrator will assign training tracks to you.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...assignments].sort((a, b) => {
                  const aTrack = a.track as TrainingTrack;
                  const bTrack = b.track as TrainingTrack;
                  const aPriority = aTrack?.is_priority ? 0 : 1;
                  const bPriority = bTrack?.is_priority ? 0 : 1;
                  if (aPriority !== bPriority) return aPriority - bPriority;
                  return (aTrack?.order_index || 0) - (bTrack?.order_index || 0);
                }).map((assignment) => {
                  const trackProgress = trackProgressData.find(t => t.trackId === assignment.track_id);
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between rounded-xl border-2 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{assignment.track?.title}</h3>
                          {(assignment.track as TrainingTrack)?.is_priority && (
                            <Badge variant="destructive" className="text-xs">Priority</Badge>
                          )}
                          {trackProgress?.percent === 100 && (
                            <Badge className="bg-brand-green text-white text-xs">Complete</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {assignment.track?.description}
                        </p>
                        {trackProgress && (
                          <div className="mt-2">
                            <Progress value={trackProgress.percent} className="h-1.5 w-48" />
                          </div>
                        )}
                      </div>
                      <Button asChild className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/25">
                        <Link to={`/training/${assignment.track_id}`}>
                          {trackProgress?.percent === 100 ? 'Review' : 'Continue'}
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card className="border-2 border-brand-blue/20 bg-brand-blue/5 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-brand-blue" />
                Training
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="sm">
                <Link to="/training">View All</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-red/20 bg-brand-red/5 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-red" />
                Homework
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-2" size="sm">
                <Link to="/training?tab=homework">View All</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-purple/20 bg-brand-purple/5 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-purple" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-2" size="sm">
                <Link to="/documents">Manage</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-yellow/20 bg-brand-yellow/5 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-brand-yellow" />
                Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-2" size="sm">
                <Link to="/certificates">View</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-green/20 bg-brand-green/5 hover:shadow-lg transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand-green" />
                Reflections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full border-2" size="sm">
                <Link to="/reflections">Write</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}