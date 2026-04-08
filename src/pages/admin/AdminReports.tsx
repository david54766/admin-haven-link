import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, BarChart3, Users, BookOpen, AlertTriangle, CheckCircle, FileText, Presentation, GraduationCap, Search, Building2, Clock, LayoutDashboard } from 'lucide-react';
import { ReportsOverview } from '@/components/admin/ReportsOverview';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { useComplianceSettings } from '@/hooks/useComplianceSettings';
import { useAuth } from '@/contexts/AuthContext';

interface HoursStatusData {
  user_id: string;
  full_name: string;
  email: string;
  center_id: string | null;
  total_hours: number;
  goal_hours: number;
  percentage: number;
  status: 'red' | 'yellow' | 'green';
}

interface EngagementData {
  user_id: string;
  full_name: string;
  email: string;
  center_id: string | null;
  videos_completed: number;
  presentations_completed: number;
  documents_completed: number;
  quizzes_passed: number;
  quizzes_failed: number;
  homework_submitted: number;
  homework_approved: number;
  last_activity: string | null;
}

interface TrackCompletionData {
  user_id: string;
  full_name: string;
  email: string;
  center_id: string | null;
  track_id: string;
  track_title: string;
  progress: number;
  total_items: number;
  completed_items: number;
  assigned_at: string;
}

interface CenterOption {
  id: string;
  name: string;
}

type CompletionStatus = 'all' | 'completed' | 'in-progress' | 'not-started';
type HomeworkViewMode = 'pending' | 'completed';
type QuizViewMode = 'failed' | 'passed';

export default function AdminReports() {
  const { toast } = useToast();
  const { profile, isSuperAdmin } = useAuth();
  const { config: complianceConfig, getStatusForPercentage, isLoading: isComplianceLoading } = useComplianceSettings();
  const [engagementData, setEngagementData] = useState<EngagementData[]>([]);
  const [trackCompletionData, setTrackCompletionData] = useState<TrackCompletionData[]>([]);
  const [failedQuizzes, setFailedQuizzes] = useState<any[]>([]);
  const [passedQuizzes, setPassedQuizzes] = useState<any[]>([]);
  const [quizViewMode, setQuizViewMode] = useState<QuizViewMode>('failed');
  const [overdueHomework, setOverdueHomework] = useState<any[]>([]);
  const [pendingHomework, setPendingHomework] = useState<any[]>([]);
  const [completedHomework, setCompletedHomework] = useState<any[]>([]);
  const [homeworkViewMode, setHomeworkViewMode] = useState<HomeworkViewMode>('pending');
  const [hoursStatusData, setHoursStatusData] = useState<HoursStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [centers, setCenters] = useState<CenterOption[]>([]);
  
  // Directors are locked to their assigned center; super admins default to all
  const directorCenterId = !isSuperAdmin && profile?.center_id ? profile.center_id : null;
  const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>(directorCenterId || 'all');
  
  // Keep center filter in sync if profile loads after initial render
  useEffect(() => {
    if (directorCenterId) {
      setSelectedCenterFilter(directorCenterId);
    }
  }, [directorCenterId]);
  
  // Track Completion filters
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<CompletionStatus>('all');

  // Get unique tracks for the filter dropdown
  const uniqueTracks = Array.from(
    new Map(trackCompletionData.map((item) => [item.track_id, { id: item.track_id, title: item.track_title }])).values()
  ).sort((a, b) => a.title.localeCompare(b.title));

  // Filtered track completion data
  const filteredTrackCompletionData = trackCompletionData.filter((item) => {
    const matchesTrack = selectedTrackFilter === 'all' || item.track_id === selectedTrackFilter;
    const matchesCenter = selectedCenterFilter === 'all' || item.center_id === selectedCenterFilter;
    const matchesStatus =
      selectedStatusFilter === 'all' ||
      (selectedStatusFilter === 'completed' && item.progress === 100) ||
      (selectedStatusFilter === 'in-progress' && item.progress > 0 && item.progress < 100) ||
      (selectedStatusFilter === 'not-started' && item.progress === 0);
    const matchesSearch =
      userSearchQuery.trim() === '' ||
      item.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    return matchesTrack && matchesCenter && matchesStatus && matchesSearch;
  });

  // Filtered engagement data
  const filteredEngagementData = engagementData.filter((item) => {
    const matchesCenter = selectedCenterFilter === 'all' || item.center_id === selectedCenterFilter;
    return matchesCenter;
  });

  useEffect(() => {
    if (!isComplianceLoading) {
      fetchReportData();
    }
  }, [isComplianceLoading, complianceConfig]);

  const fetchReportData = async () => {
    try {
      // Fetch centers
      const { data: centersData } = await supabase
        .from('centers')
        .select('id, name')
        .order('name');
      setCenters(centersData || []);

      // Fetch all approved users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved');

      if (usersError) throw usersError;

      // Fetch video progress
      const { data: videoProgress } = await supabase
        .from('video_progress')
        .select('*');

      // Fetch presentation progress
      const { data: presentationProgress } = await supabase
        .from('presentation_progress')
        .select('*');

      // Fetch document progress
      const { data: documentProgress } = await supabase
        .from('document_progress')
        .select('*');

      // Fetch quiz attempts
      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('*, quiz:quizzes(*, module:modules(*))');

      // Fetch homework submissions
      const { data: homeworkSubmissions } = await supabase
        .from('homework_submissions')
        .select('*, homework_assignment:homework_assignments(*, module:modules(*))');

      // Manually attach profile data to homework submissions
      const homeworkWithProfiles = (homeworkSubmissions || []).map((h) => ({
        ...h,
        profile: users?.find((u) => u.user_id === h.user_id) || null,
      }));

      // Fetch track assignments with full track and module data
      const { data: trackAssignments } = await supabase
        .from('staff_track_assignments')
        .select(`
          *,
          track:training_tracks(
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
          )
        `);

      // Fetch external training submissions
      const { data: externalTrainingSubmissions } = await supabase
        .from('external_training_submissions')
        .select('*');

      // Fetch lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('*');

      // Process engagement data
      const engagement: EngagementData[] = (users || []).map((user) => {
        const userVideos = (videoProgress || []).filter((v) => v.user_id === user.user_id);
        const userPresentations = (presentationProgress || []).filter((p) => p.user_id === user.user_id);
        const userDocuments = (documentProgress || []).filter((d) => d.user_id === user.user_id);
        const userQuizzes = (quizAttempts || []).filter((q) => q.user_id === user.user_id);
        const userHomework = (homeworkWithProfiles || []).filter((h) => h.user_id === user.user_id);

        const lastVideoActivity = userVideos.length > 0 
          ? Math.max(...userVideos.map((v) => new Date(v.updated_at).getTime()))
          : 0;
        const lastPresentationActivity = userPresentations.length > 0
          ? Math.max(...userPresentations.map((p) => new Date(p.updated_at).getTime()))
          : 0;
        const lastDocumentActivity = userDocuments.length > 0
          ? Math.max(...userDocuments.map((d) => new Date(d.updated_at).getTime()))
          : 0;
        const lastQuizActivity = userQuizzes.length > 0
          ? Math.max(...userQuizzes.map((q) => new Date(q.started_at).getTime()))
          : 0;
        const lastHomeworkActivity = userHomework.length > 0
          ? Math.max(...userHomework.map((h) => new Date(h.submitted_at).getTime()))
          : 0;
        const lastActivity = Math.max(lastVideoActivity, lastPresentationActivity, lastDocumentActivity, lastQuizActivity, lastHomeworkActivity);

        return {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          center_id: user.center_id,
          videos_completed: userVideos.filter((v) => v.completed_at).length,
          presentations_completed: userPresentations.filter((p) => p.completed_at).length,
          documents_completed: userDocuments.filter((d) => d.completed_at).length,
          quizzes_passed: userQuizzes.filter((q) => q.passed).length,
          quizzes_failed: userQuizzes.filter((q) => !q.passed && q.completed_at).length,
          homework_submitted: userHomework.length,
          homework_approved: userHomework.filter((h) => h.reviewed_status === 'approved').length,
          last_activity: lastActivity > 0 ? new Date(lastActivity).toISOString() : null,
        };
      });

      setEngagementData(engagement);

      // Process track completion data
      const trackCompletion: TrackCompletionData[] = [];
      
      for (const assignment of trackAssignments || []) {
        const user = users?.find((u) => u.user_id === assignment.user_id);
        if (!user) continue;
        
        const track = assignment.track as any;
        if (!track?.modules) continue;

        let totalItems = 0;
        let completedItems = 0;

        for (const module of track.modules) {
          // Count required videos
          const requiredVideos = (module.videos || []).filter((v: any) => v.is_required);
          totalItems += requiredVideos.length;
          requiredVideos.forEach((video: any) => {
            const vp = (videoProgress || []).find((p) => p.video_id === video.id && p.user_id === user.user_id);
            if (vp?.completed_at) completedItems++;
          });

          // Count required presentations
          const requiredPresentations = (module.module_presentations || []).filter((p: any) => p.is_required);
          totalItems += requiredPresentations.length;
          requiredPresentations.forEach((pres: any) => {
            const pp = (presentationProgress || []).find((p) => p.presentation_id === pres.id && p.user_id === user.user_id);
            if (pp?.completed_at) completedItems++;
          });

          // Count required documents
          const requiredDocuments = (module.module_documents || []).filter((d: any) => d.is_required);
          totalItems += requiredDocuments.length;
          requiredDocuments.forEach((doc: any) => {
            const dp = (documentProgress || []).find((d) => d.document_id === doc.id && d.user_id === user.user_id);
            if (dp?.completed_at) completedItems++;
          });

          // Count required quizzes
          const requiredQuizzes = (module.quizzes || []).filter((q: any) => q.is_required);
          totalItems += requiredQuizzes.length;
          requiredQuizzes.forEach((quiz: any) => {
            const passed = (quizAttempts || []).some((qa) => qa.quiz_id === quiz.id && qa.user_id === user.user_id && qa.passed);
            if (passed) completedItems++;
          });

          // Count required homework
          const requiredHomework = (module.homework_assignments || []).filter((h: any) => h.is_required);
          totalItems += requiredHomework.length;
          requiredHomework.forEach((hw: any) => {
            const approved = (homeworkWithProfiles || []).some(
              (hs) => hs.homework_id === hw.id && hs.user_id === user.user_id && hs.reviewed_status === 'approved'
            );
            if (approved) completedItems++;
          });

          // Count required external trainings
          const requiredExtTrainings = (module.module_external_trainings || []).filter((et: any) => et.is_required);
          totalItems += requiredExtTrainings.length;
          requiredExtTrainings.forEach((et: any) => {
            const submissions = (externalTrainingSubmissions || []).filter(
              (s: any) => s.external_training_id === et.id && s.user_id === user.user_id
            );
            const isComplete = et.requires_certificate
              ? submissions.some((s: any) => s.status === 'approved')
              : submissions.length > 0;
            if (isComplete) completedItems++;
          });

          // Count required lessons
          const requiredLessons = (module.module_lessons || []).filter((l: any) => l.is_required);
          totalItems += requiredLessons.length;
          requiredLessons.forEach((lesson: any) => {
            const lp = (lessonProgress || []).find(
              (p: any) => p.lesson_id === lesson.id && p.user_id === user.user_id
            );
            if (lp?.completed_at) completedItems++;
          });
        }

        trackCompletion.push({
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          center_id: user.center_id,
          track_id: track.id,
          track_title: track.title,
          progress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
          total_items: totalItems,
          completed_items: completedItems,
          assigned_at: assignment.assigned_at,
        });
      }

      // Sort by user name, then track title
      trackCompletion.sort((a, b) => {
        const nameCompare = a.full_name.localeCompare(b.full_name);
        if (nameCompare !== 0) return nameCompare;
        return a.track_title.localeCompare(b.track_title);
      });

      setTrackCompletionData(trackCompletion);

      // Failed quizzes (required quizzes that users have failed)
      const failed = (quizAttempts || [])
        .filter((q) => !q.passed && q.completed_at && (q.quiz as any)?.is_required)
        .map((q) => ({
          ...q,
          user: users?.find((u) => u.user_id === q.user_id),
        }));
      setFailedQuizzes(failed);

      // Passed quizzes
      const passed = (quizAttempts || [])
        .filter((q) => q.passed && q.completed_at)
        .map((q) => ({
          ...q,
          user: users?.find((u) => u.user_id === q.user_id),
        }));
      setPassedQuizzes(passed);

      // Pending homework
      const pending = (homeworkWithProfiles || []).filter((h) => h.reviewed_status === 'pending');
      setPendingHomework(pending);

      // Completed (reviewed) homework
      const completed = (homeworkWithProfiles || []).filter((h) => h.reviewed_status === 'approved' || h.reviewed_status === 'rejected');
      setCompletedHomework(completed);

      // Note: Overdue homework would require tracking when homework was assigned
      // For now, we'll show homework that's been pending review for more than 7 days
      const overdueReview = pending.filter((h) => {
        const submitDate = new Date(h.submitted_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return submitDate < sevenDaysAgo;
      });
      setOverdueHomework(overdueReview);

      // Hours Status (R/Y/G) calculation
      const currentYear = new Date().getFullYear();
      const { data: goals } = await supabase
        .from('staff_training_goals')
        .select('*')
        .eq('year', currentYear);

      const { data: hoursLogs } = await supabase
        .from('staff_hours_log')
        .select('*');

      const { data: staffCerts } = await supabase
        .from('staff_certificates')
        .select('*');

      const { data: trackCerts } = await supabase
        .from('track_certificates')
        .select('*');

      const hoursStatus: HoursStatusData[] = (users || []).map(u => {
        const goal = (goals || []).find(g => g.user_id === u.user_id);
        const goalHours = goal ? Number(goal.required_hours) : complianceConfig.default_required_hours;

        // Determine date window based on tracking period
        let yearStart: Date;
        let yearEnd: Date;

        if (complianceConfig.tracking_period === 'anniversary_year') {
          // Use hire_date if available, otherwise fall back to created_at
          const hireDate = new Date(u.hire_date || u.created_at);
          const now = new Date();
          // Find the most recent anniversary
          const thisYearAnniversary = new Date(now.getFullYear(), hireDate.getMonth(), hireDate.getDate());
          if (thisYearAnniversary > now) {
            // Anniversary hasn't happened yet this calendar year
            yearStart = new Date(now.getFullYear() - 1, hireDate.getMonth(), hireDate.getDate());
            yearEnd = new Date(thisYearAnniversary.getTime() - 1);
          } else {
            yearStart = thisYearAnniversary;
            yearEnd = new Date(now.getFullYear() + 1, hireDate.getMonth(), hireDate.getDate() - 1);
          }
        } else if (complianceConfig.tracking_period === 'fiscal_year') {
          const now = new Date();
          const fyMonth = (complianceConfig.fiscal_year_start_month || 7) - 1; // 0-indexed
          const fyDay = complianceConfig.fiscal_year_start_day || 1;
          const thisYearFiscalStart = new Date(now.getFullYear(), fyMonth, fyDay);
          if (thisYearFiscalStart > now) {
            yearStart = new Date(now.getFullYear() - 1, fyMonth, fyDay);
            yearEnd = new Date(thisYearFiscalStart.getTime() - 1);
          } else {
            yearStart = thisYearFiscalStart;
            yearEnd = new Date(now.getFullYear() + 1, fyMonth, fyDay - 1);
          }
        } else {
          yearStart = new Date(currentYear, 0, 1);
          yearEnd = new Date(currentYear, 11, 31);
        }

        // Sum hours from all 3 sources
        const manualHours = (hoursLogs || [])
          .filter(h => h.user_id === u.user_id && new Date(h.date) >= yearStart && new Date(h.date) <= yearEnd)
          .reduce((sum, h) => sum + Number(h.hours), 0);

        const certHours = (staffCerts || [])
          .filter(c => c.user_id === u.user_id && c.hours && Number(c.hours) > 0)
          .filter(c => {
            const d = new Date(c.issue_date || c.created_at);
            return d >= yearStart && d <= yearEnd;
          })
          .reduce((sum, c) => sum + Number(c.hours), 0);

        const trackHours = (trackCerts || [])
          .filter(tc => tc.user_id === u.user_id && Number(tc.hours_earned) > 0)
          .filter(tc => {
            const d = new Date(tc.issued_at);
            return d >= yearStart && d <= yearEnd;
          })
          .reduce((sum, tc) => sum + Number(tc.hours_earned), 0);

        const totalHours = manualHours + certHours + trackHours;
        const percentage = goalHours > 0 ? Math.round((totalHours / goalHours) * 100) : (totalHours > 0 ? 100 : 0);
        
        const status = getStatusForPercentage(percentage);

        return {
          user_id: u.user_id,
          full_name: u.full_name,
          email: u.email,
          center_id: u.center_id,
          total_hours: totalHours,
          goal_hours: goalHours,
          percentage,
          status,
        };
      });

      setHoursStatusData(hoursStatus);

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: 'No Data', description: 'No data to export.', variant: 'destructive' });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const value = row[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast({ title: 'Export Complete', description: `Downloaded ${filename}.csv` });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            View engagement, completion, and performance reports.
          </p>
        </div>

        {/* Global Center Filter */}
        {centers.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Center:</span>
            <Select 
              value={selectedCenterFilter} 
              onValueChange={setSelectedCenterFilter}
              disabled={!!directorCenterId}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Centers" />
              </SelectTrigger>
              <SelectContent>
                {!directorCenterId && <SelectItem value="all">All Centers</SelectItem>}
                {centers.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCenterFilter !== 'all' && !directorCenterId && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedCenterFilter('all')}>
                Clear
              </Button>
            )}
          </div>
        )}


        <Tabs defaultValue="overview">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4 hidden sm:inline-block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tracks" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-4 w-4 hidden sm:inline-block" />
              Tracks
            </TabsTrigger>
            <TabsTrigger value="hours" className="gap-1.5 text-xs sm:text-sm">
              <Clock className="h-4 w-4 hidden sm:inline-block" />
              Hours
            </TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs sm:text-sm">Engagement</TabsTrigger>
            <TabsTrigger value="failed" className="text-xs sm:text-sm">Quizzes</TabsTrigger>
            <TabsTrigger value="homework" className="text-xs sm:text-sm">Homework</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ReportsOverview
              hoursStatusData={hoursStatusData}
              trackCompletionData={trackCompletionData}
              engagementData={engagementData}
              centers={centers}
              selectedCenterFilter={selectedCenterFilter}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="tracks">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Track Completion by User</CardTitle>
                    <CardDescription>
                      View which training tracks each staff member has completed
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => exportToCSV(
                      filteredTrackCompletionData.map(t => ({
                        name: t.full_name,
                        email: t.email,
                        track: t.track_title,
                        progress: `${t.progress}%`,
                        completed_items: t.completed_items,
                        total_items: t.total_items,
                        status: t.progress === 100 ? 'Completed' : t.progress > 0 ? 'In Progress' : 'Not Started',
                        assigned_at: t.assigned_at,
                      })),
                      'track_completion_report'
                    )}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3 pt-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-8 w-[220px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Track:</span>
                    <Select value={selectedTrackFilter} onValueChange={setSelectedTrackFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All Tracks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tracks</SelectItem>
                        {uniqueTracks.map((track) => (
                          <SelectItem key={track.id} value={track.id}>
                            {track.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Select value={selectedStatusFilter} onValueChange={(v) => setSelectedStatusFilter(v as CompletionStatus)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="not-started">Not Started</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(selectedTrackFilter !== 'all' || selectedStatusFilter !== 'all' || userSearchQuery.trim() !== '') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTrackFilter('all');
                        setSelectedStatusFilter('all');
                        setUserSearchQuery('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : trackCompletionData.length === 0 ? (
                  <p className="text-muted-foreground">No track assignments found.</p>
                ) : filteredTrackCompletionData.length === 0 ? (
                  <p className="text-muted-foreground">No results match the selected filters.</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Showing {filteredTrackCompletionData.length} of {trackCompletionData.length} assignments
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Track</TableHead>
                          <TableHead className="w-[200px]">Progress</TableHead>
                          <TableHead className="text-center">Items</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTrackCompletionData.map((item) => (
                          <TableRow key={`${item.user_id}-${item.track_id}`}>
                            <TableCell className="font-medium">{item.full_name}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>{item.track_title}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={item.progress} className="h-2 flex-1" />
                                <span className="text-sm text-muted-foreground w-12">{item.progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {item.completed_items}/{item.total_items}
                            </TableCell>
                            <TableCell>
                              {item.progress === 100 ? (
                                <Badge className="bg-primary text-primary-foreground">Completed</Badge>
                              ) : item.progress > 0 ? (
                                <Badge variant="secondary">In Progress</Badge>
                              ) : (
                                <Badge variant="outline">Not Started</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(item.assigned_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Hours Completion Status</CardTitle>
                    <CardDescription>
                      Staff training hours progress against their {complianceConfig.tracking_period === 'anniversary_year' ? 'anniversary year' : complianceConfig.tracking_period === 'fiscal_year' ? 'fiscal year' : 'calendar year'} goals
                      {complianceConfig.default_required_hours > 0 && ` (default: ${complianceConfig.default_required_hours} hrs/year)`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(
                      hoursStatusData
                        .filter(h => selectedCenterFilter === 'all' || h.center_id === selectedCenterFilter)
                        .map(h => ({
                          name: h.full_name,
                          email: h.email,
                          total_hours: h.total_hours,
                          goal_hours: h.goal_hours,
                          percentage: `${h.percentage}%`,
                          status: h.status.toUpperCase(),
                        })),
                      'hours_status_report'
                    )}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
                <div className="flex gap-4 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground">{'<'}{complianceConfig.thresholds.yellow_min}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-xs text-muted-foreground">{complianceConfig.thresholds.yellow_min}-{complianceConfig.thresholds.green_min - 1}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">≥{complianceConfig.thresholds.green_min}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Hours</TableHead>
                        <TableHead className="text-center">Goal</TableHead>
                        <TableHead className="w-[180px]">Progress</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hoursStatusData
                        .filter(h => selectedCenterFilter === 'all' || h.center_id === selectedCenterFilter)
                        .sort((a, b) => a.percentage - b.percentage)
                        .map((item) => (
                        <TableRow key={item.user_id}>
                          <TableCell className="font-medium">{item.full_name}</TableCell>
                          <TableCell>{item.email}</TableCell>
                          <TableCell className="text-center">{item.total_hours.toFixed(1)}</TableCell>
                          <TableCell className="text-center">{item.goal_hours > 0 ? item.goal_hours : '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    item.status === 'green' ? 'bg-green-500' :
                                    item.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10">{item.percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              item.status === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              item.status === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              <div className={`h-2 w-2 rounded-full ${
                                item.status === 'green' ? 'bg-green-500' :
                                item.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              {item.status === 'green' ? 'On Track' : item.status === 'yellow' ? 'Behind' : 'At Risk'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Engagement</CardTitle>
                  <CardDescription>
                    Training progress for all approved staff members
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => exportToCSV(filteredEngagementData, 'engagement_report')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-center">Videos</TableHead>
                        <TableHead className="text-center">Presentations</TableHead>
                        <TableHead className="text-center">Documents</TableHead>
                        <TableHead className="text-center">Quizzes Passed</TableHead>
                        <TableHead className="text-center">Quizzes Failed</TableHead>
                        <TableHead className="text-center">Homework</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEngagementData.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="text-center">{user.videos_completed}</TableCell>
                          <TableCell className="text-center">{user.presentations_completed}</TableCell>
                          <TableCell className="text-center">{user.documents_completed}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{user.quizzes_passed}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {user.quizzes_failed > 0 ? (
                              <Badge variant="destructive">{user.quizzes_failed}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {user.homework_approved}/{user.homework_submitted}
                          </TableCell>
                          <TableCell>
                            {user.last_activity
                              ? format(new Date(user.last_activity), 'MMM d, yyyy')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failed">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{quizViewMode === 'failed' ? 'Failed Required Quizzes' : 'Passed Quizzes'}</CardTitle>
                    <CardDescription>
                      {quizViewMode === 'failed'
                        ? 'Staff who failed required quizzes and may need additional support'
                        : 'Staff who have successfully passed quizzes'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={quizViewMode} onValueChange={(v) => setQuizViewMode(v as QuizViewMode)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="passed">Passed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const data = quizViewMode === 'failed' ? failedQuizzes : passedQuizzes;
                        exportToCSV(
                          data.map((q) => ({
                            name: q.user?.full_name,
                            email: q.user?.email,
                            quiz: (q.quiz as any)?.title,
                            module: (q.quiz as any)?.module?.title,
                            score: q.score,
                            max_score: q.max_score,
                            percentage: Math.round((q.score / q.max_score) * 100),
                            date: q.completed_at,
                          })),
                          `${quizViewMode}_quizzes`
                        );
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const data = quizViewMode === 'failed' ? failedQuizzes : passedQuizzes;
                  if (data.length === 0) {
                    return <p className="text-muted-foreground">No {quizViewMode} quizzes.</p>;
                  }
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Quiz</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((attempt) => (
                          <TableRow key={attempt.id}>
                            <TableCell className="font-medium">{attempt.user?.full_name}</TableCell>
                            <TableCell>{(attempt.quiz as any)?.title}</TableCell>
                            <TableCell>{(attempt.quiz as any)?.module?.title || '—'}</TableCell>
                            <TableCell>
                              <Badge variant={quizViewMode === 'failed' ? 'destructive' : 'default'}>
                                {attempt.score}/{attempt.max_score} ({Math.round((attempt.score / attempt.max_score) * 100)}%)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(new Date(attempt.completed_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="homework">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{homeworkViewMode === 'pending' ? 'Pending Homework Submissions' : 'Completed Homework Submissions'}</CardTitle>
                    <CardDescription>
                      {homeworkViewMode === 'pending' ? 'Homework awaiting review' : 'Homework that has been reviewed'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={homeworkViewMode} onValueChange={(v) => setHomeworkViewMode(v as HomeworkViewMode)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const data = homeworkViewMode === 'pending' ? pendingHomework : completedHomework;
                        exportToCSV(
                          data.map((h) => ({
                            name: (h.profile as any)?.full_name,
                            email: (h.profile as any)?.email,
                            assignment: (h.homework_assignment as any)?.title,
                            module: (h.homework_assignment as any)?.module?.title,
                            submitted: h.submitted_at,
                            status: h.reviewed_status,
                            file: h.file_name,
                            ...(homeworkViewMode === 'completed' ? { reviewed_at: h.reviewed_at } : {}),
                          })),
                          `${homeworkViewMode}_homework`
                        );
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const data = homeworkViewMode === 'pending' ? pendingHomework : completedHomework;
                  if (data.length === 0) {
                    return <p className="text-muted-foreground">No {homeworkViewMode} homework submissions.</p>;
                  }
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead>Submitted</TableHead>
                          {homeworkViewMode === 'completed' && <TableHead>Status</TableHead>}
                          <TableHead>File</TableHead>
                          {homeworkViewMode === 'pending' && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell className="font-medium">
                              {(submission.profile as any)?.full_name}
                            </TableCell>
                            <TableCell>{(submission.homework_assignment as any)?.title}</TableCell>
                            <TableCell>{(submission.homework_assignment as any)?.module?.title || '—'}</TableCell>
                            <TableCell>
                              {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                            </TableCell>
                            {homeworkViewMode === 'completed' && (
                              <TableCell>
                                <Badge variant={submission.reviewed_status === 'approved' ? 'default' : 'destructive'}>
                                  {submission.reviewed_status === 'approved' ? 'Approved' : 'Rejected'}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell>
                              <a
                                href={submission.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {submission.file_name}
                              </a>
                            </TableCell>
                            {homeworkViewMode === 'pending' && (
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline">
                                  Review
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
