import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Clock, AlertTriangle, TrendingUp, BarChart3, Building2 } from 'lucide-react';
import {
  PieChart,
  Pie as PieRaw,
  Cell as CellRaw,
  BarChart,
  Bar as BarRaw,
  XAxis as XAxisRaw,
  YAxis as YAxisRaw,
  CartesianGrid as CartesianGridRaw,
  Tooltip as TooltipRaw,
  ResponsiveContainer,
  Legend as LegendRaw,
  LineChart,
  Line as LineRaw,
  AreaChart,
  Area as AreaRaw,
} from 'recharts';

// Recharts 2.x has type incompatibilities with newer @types/react.
// Cast to any to satisfy the JSX element type checks without changing runtime behavior.
const Pie = PieRaw as any;
const Cell = CellRaw as any;
const Bar = BarRaw as any;
const XAxis = XAxisRaw as any;
const YAxis = YAxisRaw as any;
const CartesianGrid = CartesianGridRaw as any;
const Tooltip = TooltipRaw as any;
const Legend = LegendRaw as any;
const Line = LineRaw as any;
const Area = AreaRaw as any;

interface HoursStatusData {
  user_id: string;
  full_name: string;
  total_hours: number;
  goal_hours: number;
  percentage: number;
  status: 'red' | 'yellow' | 'green';
  center_id: string | null;
}

interface TrackCompletionData {
  user_id: string;
  full_name: string;
  track_id: string;
  track_title: string;
  progress: number;
  total_items: number;
  completed_items: number;
  center_id: string | null;
}

interface EngagementData {
  user_id: string;
  full_name: string;
  videos_completed: number;
  presentations_completed: number;
  documents_completed: number;
  quizzes_passed: number;
  quizzes_failed: number;
  homework_submitted: number;
  homework_approved: number;
  last_activity: string | null;
  center_id: string | null;
}

interface CenterOption {
  id: string;
  name: string;
}

interface ReportsOverviewProps {
  hoursStatusData: HoursStatusData[];
  trackCompletionData: TrackCompletionData[];
  engagementData: EngagementData[];
  centers: CenterOption[];
  selectedCenterFilter: string;
  isLoading: boolean;
}

const STATUS_COLORS = {
  green: 'hsl(142, 71%, 45%)',
  yellow: 'hsl(48, 96%, 53%)',
  red: 'hsl(0, 84%, 60%)',
};

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(0, 84%, 60%)',
  'hsl(48, 96%, 53%)',
  'hsl(280, 65%, 60%)',
  'hsl(330, 80%, 55%)',
  'hsl(180, 60%, 45%)',
  'hsl(25, 95%, 55%)',
];

export function ReportsOverview({
  hoursStatusData,
  trackCompletionData,
  engagementData,
  centers,
  selectedCenterFilter,
  isLoading,
}: ReportsOverviewProps) {
  // Filter by center
  const filteredHours = hoursStatusData.filter(
    (h) => selectedCenterFilter === 'all' || h.center_id === selectedCenterFilter
  );
  const filteredTracks = trackCompletionData.filter(
    (t) => selectedCenterFilter === 'all' || t.center_id === selectedCenterFilter
  );
  const filteredEngagement = engagementData.filter(
    (e) => selectedCenterFilter === 'all' || e.center_id === selectedCenterFilter
  );

  // --- Summary stats ---
  const totalStaff = filteredEngagement.length;
  const greenCount = filteredHours.filter((h) => h.status === 'green').length;
  const yellowCount = filteredHours.filter((h) => h.status === 'yellow').length;
  const redCount = filteredHours.filter((h) => h.status === 'red').length;

  const totalTrackAssignments = filteredTracks.length;
  const completedTracks = filteredTracks.filter((t) => t.progress === 100).length;
  const inProgressTracks = filteredTracks.filter((t) => t.progress > 0 && t.progress < 100).length;
  const notStartedTracks = filteredTracks.filter((t) => t.progress === 0).length;

  // --- Hours compliance pie data ---
  const hoursCompliancePie = [
    { name: 'On Track', value: greenCount, color: STATUS_COLORS.green },
    { name: 'At Risk', value: yellowCount, color: STATUS_COLORS.yellow },
    { name: 'Behind', value: redCount, color: STATUS_COLORS.red },
  ].filter((d) => d.value > 0);

  // --- Track status pie data ---
  const trackStatusPie = [
    { name: 'Completed', value: completedTracks, color: 'hsl(142, 71%, 45%)' },
    { name: 'In Progress', value: inProgressTracks, color: 'hsl(217, 91%, 60%)' },
    { name: 'Not Started', value: notStartedTracks, color: 'hsl(215, 20%, 65%)' },
  ].filter((d) => d.value > 0);

  // --- Track completion bar chart (avg progress per track) ---
  const trackProgressMap = new Map<string, { title: string; totalProgress: number; count: number }>();
  filteredTracks.forEach((t) => {
    const existing = trackProgressMap.get(t.track_id);
    if (existing) {
      existing.totalProgress += t.progress;
      existing.count += 1;
    } else {
      trackProgressMap.set(t.track_id, { title: t.track_title, totalProgress: t.progress, count: 1 });
    }
  });
  const trackAvgProgress = Array.from(trackProgressMap.values())
    .map((t) => ({
      name: t.title.length > 20 ? t.title.substring(0, 18) + '…' : t.title,
      fullName: t.title,
      avgProgress: Math.round(t.totalProgress / t.count),
      enrolled: t.count,
    }))
    .sort((a, b) => b.avgProgress - a.avgProgress);

  // --- Engagement summary bar chart ---
  const totalVideos = filteredEngagement.reduce((s, e) => s + e.videos_completed, 0);
  const totalPresentations = filteredEngagement.reduce((s, e) => s + e.presentations_completed, 0);
  const totalDocuments = filteredEngagement.reduce((s, e) => s + e.documents_completed, 0);
  const totalQuizzesPassed = filteredEngagement.reduce((s, e) => s + e.quizzes_passed, 0);
  const totalHwApproved = filteredEngagement.reduce((s, e) => s + e.homework_approved, 0);

  const engagementBarData = [
    { name: 'Videos', completed: totalVideos },
    { name: 'Presentations', completed: totalPresentations },
    { name: 'Documents', completed: totalDocuments },
    { name: 'Quizzes Passed', completed: totalQuizzesPassed },
    { name: 'Homework', completed: totalHwApproved },
  ];

  // --- Average hours per staff ---
  const avgHours =
    filteredHours.length > 0
      ? (filteredHours.reduce((s, h) => s + h.total_hours, 0) / filteredHours.length).toFixed(1)
      : '0';

  // --- Per-Center Staff & Compliance Breakdown ---
  const centerStaffData = centers.map((center, idx) => {
    const centerEngagement = engagementData.filter((e) => e.center_id === center.id);
    const centerHours = hoursStatusData.filter((h) => h.center_id === center.id);
    const centerTracks = trackCompletionData.filter((t) => t.center_id === center.id);
    const onTrack = centerHours.filter((h) => h.status === 'green').length;
    const atRisk = centerHours.filter((h) => h.status === 'yellow').length;
    const behind = centerHours.filter((h) => h.status === 'red').length;
    const avgProgress = centerTracks.length > 0
      ? Math.round(centerTracks.reduce((s, t) => s + t.progress, 0) / centerTracks.length)
      : 0;
    return {
      name: center.name.length > 16 ? center.name.substring(0, 14) + '…' : center.name,
      fullName: center.name,
      staff: centerEngagement.length,
      onTrack,
      atRisk,
      behind,
      avgProgress,
    };
  }).filter((c) => c.staff > 0);

  // --- Per-Center Average Track Progress ---
  const centerProgressData = centers.map((center) => {
    const centerTracks = trackCompletionData.filter((t) => t.center_id === center.id);
    const avgProgress = centerTracks.length > 0
      ? Math.round(centerTracks.reduce((s, t) => s + t.progress, 0) / centerTracks.length)
      : 0;
    const completedCount = centerTracks.filter((t) => t.progress === 100).length;
    return {
      name: center.name.length > 16 ? center.name.substring(0, 14) + '…' : center.name,
      fullName: center.name,
      avgProgress,
      completed: completedCount,
      total: centerTracks.length,
    };
  }).filter((c) => c.total > 0);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm">
          <p className="font-medium">{data.fullName || label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: {p.value}{p.dataKey === 'avgProgress' ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{totalStaff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2.5">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hours On Track</p>
                <p className="text-2xl font-bold">{greenCount}<span className="text-sm text-muted-foreground font-normal">/{totalStaff}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2.5">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Hours</p>
                <p className="text-2xl font-bold">{avgHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-500/10 p-2.5">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tracks Completed</p>
                <p className="text-2xl font-bold">{completedTracks}<span className="text-sm text-muted-foreground font-normal">/{totalTrackAssignments}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Pie Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Hours Compliance</CardTitle>
            <CardDescription>Staff training hours status</CardDescription>
          </CardHeader>
          <CardContent>
            {hoursCompliancePie.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-10">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={hoursCompliancePie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {hoursCompliancePie.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Track Assignments</CardTitle>
            <CardDescription>Overall track completion status</CardDescription>
          </CardHeader>
          <CardContent>
            {trackStatusPie.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-10">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={trackStatusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {trackStatusPie.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Center Status */}
      {centers.length > 1 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-bold">Center Hours Compliance</CardTitle>
              </div>
              <CardDescription>On Track / At Risk / Behind by center</CardDescription>
            </CardHeader>
            <CardContent>
              {centerStaffData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={centerStaffData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="onTrack" name="On Track" stackId="status" fill={STATUS_COLORS.green} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="atRisk" name="At Risk" stackId="status" fill={STATUS_COLORS.yellow} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="behind" name="Behind" stackId="status" fill={STATUS_COLORS.red} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base font-bold">Center Track Progress</CardTitle>
              </div>
              <CardDescription>Average track completion % per center</CardDescription>
            </CardHeader>
            <CardContent>
              {centerProgressData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={centerProgressData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avgProgress" name="Avg Progress" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row 3: Track & Engagement */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Average Track Progress</CardTitle>
            <CardDescription>Mean completion % across enrolled staff</CardDescription>
          </CardHeader>
          <CardContent>
            {trackAvgProgress.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-10">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trackAvgProgress} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgProgress" name="Avg Progress" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Activity Summary</CardTitle>
            <CardDescription>Total completed items across all staff</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={engagementBarData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="completed" name="Completed" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 4: Progress Graphs */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Graph 1: Training Hours Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Hours Distribution</CardTitle>
            <CardDescription>Staff training hours vs goals</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const buckets = [
                { name: '0-25%', count: filteredHours.filter(h => h.percentage >= 0 && h.percentage < 25).length },
                { name: '25-50%', count: filteredHours.filter(h => h.percentage >= 25 && h.percentage < 50).length },
                { name: '50-75%', count: filteredHours.filter(h => h.percentage >= 50 && h.percentage < 75).length },
                { name: '75-100%', count: filteredHours.filter(h => h.percentage >= 75 && h.percentage <= 100).length },
                { name: '100%+', count: filteredHours.filter(h => h.percentage > 100).length },
              ].filter(b => b.count > 0);
              return buckets.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={buckets}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Staff Count" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* Graph 2: Track Completion Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Completion Brackets</CardTitle>
            <CardDescription>Staff across track completion ranges</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const brackets = [
                { name: '0%', count: filteredTracks.filter(t => t.progress === 0).length, fill: 'hsl(215, 20%, 65%)' },
                { name: '1-25%', count: filteredTracks.filter(t => t.progress > 0 && t.progress <= 25).length, fill: 'hsl(0, 84%, 60%)' },
                { name: '26-50%', count: filteredTracks.filter(t => t.progress > 25 && t.progress <= 50).length, fill: 'hsl(48, 96%, 53%)' },
                { name: '51-75%', count: filteredTracks.filter(t => t.progress > 50 && t.progress <= 75).length, fill: 'hsl(217, 91%, 60%)' },
                { name: '76-99%', count: filteredTracks.filter(t => t.progress > 75 && t.progress < 100).length, fill: 'hsl(180, 60%, 45%)' },
                { name: '100%', count: filteredTracks.filter(t => t.progress === 100).length, fill: 'hsl(142, 71%, 45%)' },
              ].filter(b => b.count > 0);
              return brackets.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={brackets}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Assignments">
                      {brackets.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* Graph 3: Staff Engagement Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Engagement Overview</CardTitle>
            <CardDescription>Average completions per staff member</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const staffCount = filteredEngagement.length || 1;
              const avgData = [
                { name: 'Videos', avg: +(totalVideos / staffCount).toFixed(1) },
                { name: 'Docs', avg: +(totalDocuments / staffCount).toFixed(1) },
                { name: 'Quizzes', avg: +(totalQuizzesPassed / staffCount).toFixed(1) },
                { name: 'Homework', avg: +(totalHwApproved / staffCount).toFixed(1) },
                { name: 'Slides', avg: +(totalPresentations / staffCount).toFixed(1) },
              ];
              return (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={avgData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="avg" name="Avg per Staff" fill="hsl(280, 65%, 60%)" fillOpacity={0.3} stroke="hsl(280, 65%, 60%)" />
                  </AreaChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
