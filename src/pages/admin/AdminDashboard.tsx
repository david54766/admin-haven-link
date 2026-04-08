import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  GraduationCap,
  ClipboardCheck,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AnnouncementManager } from '@/components/admin/AnnouncementManager';
import { AdminReflectionsView } from '@/components/admin/AdminReflectionsView';

export default function AdminDashboard() {
  const { isAdmin, isSuperAdmin, profile } = useAuth();
  const directorCenterId = !isSuperAdmin && profile?.center_id ? profile.center_id : null;
  const [stats, setStats] = useState({
    pendingUsers: 0,
    approvedUsers: 0,
    totalTracks: 0,
    totalModules: 0,
    pendingHomework: 0,
    failedQuizzes: 0,
    totalResources: 0,
    totalSubmissions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [directorCenterId]);

  const fetchStats = async () => {
    try {
      // Build profile queries with optional center filter for directors
      let pendingQuery = supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'pending');
      let approvedQuery = supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'approved');
      if (directorCenterId) {
        pendingQuery = pendingQuery.eq('center_id', directorCenterId);
        approvedQuery = approvedQuery.eq('center_id', directorCenterId);
      }

      const [pendingRes, approvedRes, tracksRes, modulesRes, homeworkRes, quizRes, resourcesRes, submissionsRes] = await Promise.all([
        pendingQuery,
        approvedQuery,
        supabase.from('training_tracks').select('id', { count: 'exact' }),
        supabase.from('modules').select('id', { count: 'exact' }),
        supabase.from('homework_submissions').select('id', { count: 'exact' }).eq('reviewed_status', 'pending'),
        supabase.from('quiz_attempts').select('id', { count: 'exact' }).eq('passed', false),
        supabase.from('shared_resources').select('id', { count: 'exact' }),
        supabase.from('important_document_submissions').select('id', { count: 'exact' }),
      ]);

      setStats({
        pendingUsers: pendingRes.count || 0,
        approvedUsers: approvedRes.count || 0,
        totalTracks: tracksRes.count || 0,
        totalModules: modulesRes.count || 0,
        pendingHomework: homeworkRes.count || 0,
        failedQuizzes: quizRes.count || 0,
        totalResources: resourcesRes.count || 0,
        totalSubmissions: submissionsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      label: 'Users',
      description: 'Manage staff accounts',
      icon: Users,
      href: '/admin/users',
      color: 'brand-blue',
      stat: `${stats.approvedUsers} active`,
    },
    {
      label: 'Content',
      description: 'Tracks & modules',
      icon: BookOpen,
      href: '/admin/content',
      color: 'brand-purple',
      stat: `${stats.totalTracks} tracks`,
    },
    {
      label: 'Documents',
      description: 'Resources & documents',
      icon: FileText,
      href: '/admin/documents',
      color: 'brand-red',
      stat: `${stats.totalResources} resources`,
    },
    {
      label: 'Certificates',
      description: 'Hours & credentials',
      icon: GraduationCap,
      href: '/admin/certificates',
      color: 'brand-yellow',
    },
    {
      label: 'Checklists',
      description: 'Daily checklists',
      icon: ClipboardCheck,
      href: '/admin/checklists',
      color: 'brand-green',
    },
    {
      label: 'Reports',
      description: 'Analytics & data',
      icon: BarChart3,
      href: '/admin/reports',
      color: 'brand-orange',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'brand-blue': { bg: 'bg-brand-blue/10', text: 'text-brand-blue', border: 'border-brand-blue/30' },
    'brand-purple': { bg: 'bg-brand-purple/10', text: 'text-brand-purple', border: 'border-brand-purple/30' },
    'brand-red': { bg: 'bg-brand-red/10', text: 'text-brand-red', border: 'border-brand-red/30' },
    'brand-yellow': { bg: 'bg-brand-yellow/10', text: 'text-brand-yellow', border: 'border-brand-yellow/30' },
    'brand-green': { bg: 'bg-brand-green/10', text: 'text-brand-green', border: 'border-brand-green/30' },
    'brand-orange': { bg: 'bg-brand-orange/10', text: 'text-brand-orange', border: 'border-brand-orange/30' },
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50">
              <Sparkles className="h-3 w-3 text-brand-purple" />
              <span className="text-xs font-medium text-foreground">Administration</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your platform at a glance.
          </p>
        </div>

        {/* Urgent Alerts */}
        {(stats.pendingUsers > 0 || stats.pendingHomework > 0) && (
          <div className="grid gap-3 md:grid-cols-2">
            {stats.pendingUsers > 0 && (
          <Card className="border-2 border-brand-yellow/40 bg-brand-yellow/5">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-yellow/20">
                      <Clock className="h-5 w-5 text-brand-yellow" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {stats.pendingUsers} pending user{stats.pendingUsers !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">Awaiting approval</p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link to="/admin/users?status=pending">
                      Review
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            {stats.pendingHomework > 0 && (
            <Card className="border-2 border-brand-red/40 bg-brand-red/5">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-red/20">
                      <ClipboardCheck className="h-5 w-5 text-brand-red" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {stats.pendingHomework} homework submission{stats.pendingHomework !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">Needs review</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                    <Link to="/admin/content?tab=homework">
                      Review
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
              <div className="p-2 rounded-lg bg-brand-blue/10">
                <Users className="h-4 w-4 text-brand-blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.approvedUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingUsers > 0 ? `+${stats.pendingUsers} pending` : 'All reviewed'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Tracks</CardTitle>
              <div className="p-2 rounded-lg bg-brand-purple/10">
                <BookOpen className="h-4 w-4 text-brand-purple" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTracks}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.totalModules} modules total</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Homework</CardTitle>
              <div className="p-2 rounded-lg bg-brand-red/10">
                <ClipboardCheck className="h-4 w-4 text-brand-red" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats.pendingHomework > 0 ? 'text-destructive' : ''}`}>
                {stats.pendingHomework}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shared Resources</CardTitle>
              <div className="p-2 rounded-lg bg-brand-green/10">
                <FileText className="h-4 w-4 text-brand-green" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalResources}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.totalSubmissions} doc submissions</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Quick Actions</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const colors = colorMap[action.color];
              return (
                <Link
                  key={action.href}
                  to={action.href}
                  className={`group block rounded-xl border-2 p-4 transition-all hover:shadow-lg ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg bg-background shadow-sm`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-semibold text-foreground">{action.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  {action.stat && (
                    <p className="text-xs font-medium text-foreground mt-2">{action.stat}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Announcements */}
        <AnnouncementManager />

        {/* Staff Reflections */}
        <AdminReflectionsView />
      </div>
    </Layout>
  );
}
