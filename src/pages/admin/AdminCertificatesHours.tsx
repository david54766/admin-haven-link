import { useEffect, useState, Fragment as FragmentRow } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Download, Award, Clock, Search, AlertTriangle, TrendingUp, Target, Edit2, Mail, Plus, RefreshCw, Printer, FileDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Link } from 'react-router-dom';
import { HoursTimeFilter, TimePreset } from '@/components/admin/HoursTimeFilter';
import { UpdateCertificateDialog } from '@/components/UpdateCertificateDialog';
import { PreviousCertificateAccordion } from '@/components/PreviousCertificateAccordion';

interface Certificate {
  id: string;
  user_id: string;
  title: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  hours: number | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface HoursLog {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  category: string;
  description: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface StaffHoursSummary {
  user_id: string;
  full_name: string;
  email: string;
  total_hours: number;
  this_month_hours: number;
  entries_count: number;
  required_hours: number;
  year_goal_id: string | null;
  manual_hours: number;
  certificate_hours: number;
  track_hours: number;
}

interface TrainingGoal {
  id: string;
  user_id: string;
  year: number;
  required_hours: number;
}

const HOUR_CATEGORIES: Record<string, string> = {
  training: 'Training',
  professional_development: 'Professional Development',
  workshop: 'Workshop',
  conference: 'Conference',
  mentoring: 'Mentoring',
  volunteer: 'Volunteer',
  other: 'Other',
};

export default function AdminCertificatesHours() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [hoursLog, setHoursLog] = useState<HoursLog[]>([]);
  const [hoursSummary, setHoursSummary] = useState<StaffHoursSummary[]>([]);
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Goal editing
  const [editGoalDialogOpen, setEditGoalDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffHoursSummary | null>(null);
  const [goalHours, setGoalHours] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [notifyingUserId, setNotifyingUserId] = useState<string | null>(null);
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const currentYear = new Date().getFullYear();

  // Add certificate for staff
  const [addCertDialogOpen, setAddCertDialogOpen] = useState(false);
  const [addCertUserId, setAddCertUserId] = useState('');
  const [addCertTitle, setAddCertTitle] = useState('');
  const [addCertOrg, setAddCertOrg] = useState('');
  const [addCertIssueDate, setAddCertIssueDate] = useState('');
  const [addCertExpiryDate, setAddCertExpiryDate] = useState('');
  const [addCertNumber, setAddCertNumber] = useState('');
  const [addCertHours, setAddCertHours] = useState('');
  const [addCertNotes, setAddCertNotes] = useState('');
  const [addCertFile, setAddCertFile] = useState<File | null>(null);
  const [addCertSaving, setAddCertSaving] = useState(false);
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updatingCert, setUpdatingCert] = useState<Certificate | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [certRes, hoursRes, profilesRes, goalsRes, trackCertsRes] = await Promise.all([
        supabase
          .from('staff_certificates')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('staff_hours_log')
          .select('*')
          .order('date', { ascending: false }),
        supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .eq('status', 'approved'),
        supabase
          .from('staff_training_goals')
          .select('*')
          .eq('year', currentYear),
        supabase
          .from('track_certificates')
          .select('id, user_id, track_title, hours_earned, issued_at'),
      ]);

      if (certRes.error) throw certRes.error;
      if (hoursRes.error) throw hoursRes.error;

      const certData = certRes.data || [];
      const hoursData = hoursRes.data || [];
      const profiles = profilesRes.data || [];
      const goalsData = goalsRes.data || [];
      const trackCertsData = trackCertsRes.data || [];

      const goalsMap = new Map(goalsData.map((g) => [g.user_id, g]));
      setTrainingGoals(goalsData as TrainingGoal[]);

      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
      setStaffList(profiles.map(p => ({ user_id: p.user_id, full_name: p.full_name, email: p.email })));

      // Enrich certificates with profile data
      const enrichedCerts = certData.map((cert) => ({
        ...cert,
        profile: profileMap.get(cert.user_id),
      })) as Certificate[];

      // Enrich hours with profile data
      const enrichedHours = hoursData.map((log) => ({
        ...log,
        profile: profileMap.get(log.user_id),
      })) as HoursLog[];

      setCertificates(enrichedCerts);
      setHoursLog(enrichedHours);

      // Calculate hours summary per user (for current year only)
      // Include ALL 3 sources: manual logs, certificate hours, track completion hours
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);

      const summaryMap = new Map<string, StaffHoursSummary>();
      
      profiles.forEach((profile) => {
        const goal = goalsMap.get(profile.user_id);
        summaryMap.set(profile.user_id, {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          total_hours: 0,
          this_month_hours: 0,
          entries_count: 0,
          required_hours: goal ? Number(goal.required_hours) : 0,
          year_goal_id: goal?.id || null,
          manual_hours: 0,
          certificate_hours: 0,
          track_hours: 0,
        });
      });

      // Source 1: Manual hours log entries
      enrichedHours.forEach((log) => {
        const summary = summaryMap.get(log.user_id);
        if (summary) {
          const logDate = new Date(log.date);
          if (logDate >= yearStart && logDate <= yearEnd) {
            summary.total_hours += Number(log.hours);
            summary.manual_hours += Number(log.hours);
            summary.entries_count += 1;
          }
          if (logDate >= monthStart && logDate <= monthEnd) {
            summary.this_month_hours += Number(log.hours);
          }
        }
      });

      // Source 2: Certificate hours (from staff_certificates with hours > 0)
      certData.forEach((cert: any) => {
        if (cert.hours && Number(cert.hours) > 0) {
          const summary = summaryMap.get(cert.user_id);
          if (summary) {
            const certDate = new Date(cert.issue_date || cert.created_at);
            if (certDate >= yearStart && certDate <= yearEnd) {
              summary.total_hours += Number(cert.hours);
              summary.certificate_hours += Number(cert.hours);
              summary.entries_count += 1;
            }
            if (certDate >= monthStart && certDate <= monthEnd) {
              summary.this_month_hours += Number(cert.hours);
            }
          }
        }
      });

      // Source 3: Track completion certificate hours
      trackCertsData.forEach((tc: any) => {
        if (tc.hours_earned && Number(tc.hours_earned) > 0) {
          const summary = summaryMap.get(tc.user_id);
          if (summary) {
            const tcDate = new Date(tc.issued_at);
            if (tcDate >= yearStart && tcDate <= yearEnd) {
              summary.total_hours += Number(tc.hours_earned);
              summary.track_hours += Number(tc.hours_earned);
              summary.entries_count += 1;
            }
            if (tcDate >= monthStart && tcDate <= monthEnd) {
              summary.this_month_hours += Number(tc.hours_earned);
            }
          }
        }
      });

      setHoursSummary(Array.from(summaryMap.values()).sort((a, b) => b.total_hours - a.total_hours));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditGoal = (staff: StaffHoursSummary) => {
    setEditingUser(staff);
    setGoalHours(staff.required_hours > 0 ? staff.required_hours.toString() : '');
    setEditGoalDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!editingUser || !user) return;

    const hours = parseFloat(goalHours) || 0;
    setSavingGoal(true);

    try {
      if (editingUser.year_goal_id) {
        // Update existing goal
        const { error } = await supabase
          .from('staff_training_goals')
          .update({ required_hours: hours, set_by: user.id })
          .eq('id', editingUser.year_goal_id);

        if (error) throw error;
      } else {
        // Create new goal
        const { error } = await supabase
          .from('staff_training_goals')
          .insert({
            user_id: editingUser.user_id,
            year: currentYear,
            required_hours: hours,
            set_by: user.id,
          });

        if (error) throw error;
      }

      toast({ title: 'Training goal updated' });
      setEditGoalDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      toast({ title: 'Failed to save goal', description: error.message, variant: 'destructive' });
    } finally {
      setSavingGoal(false);
    }
  };

  const handleSendExpiryNotifications = async () => {
    setSendingNotifications(true);
    try {
      const response = await supabase.functions.invoke('send-certificate-expiry-notifications');
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.expiringCertificates === 0) {
        toast({ 
          title: 'No Expiring Certificates', 
          description: 'No certificates are expiring in the next 30 days.' 
        });
      } else {
        toast({ 
          title: 'Notifications Sent', 
          description: `Notified ${data.staffNotified} staff member(s) and ${data.adminNotified} admin(s) about ${data.expiringCertificates} expiring certificate(s).` 
        });
      }
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      toast({ 
        title: 'Failed to Send Notifications', 
        description: error.message || 'An error occurred while sending notifications.',
        variant: 'destructive' 
      });
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleSendUserExpiryNotification = async (userId: string, userName: string) => {
    setNotifyingUserId(userId);
    try {
      const response = await supabase.functions.invoke('send-certificate-expiry-notifications', {
        body: { user_id: userId },
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.expiringCertificates === 0) {
        toast({ 
          title: 'No Action Needed', 
          description: `${userName} has no expiring certificates to notify about.` 
        });
      } else {
        toast({ 
          title: 'Notification Sent', 
          description: `Sent expiry reminder to ${userName} for ${data.expiringCertificates} certificate(s).` 
        });
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({ 
        title: 'Failed to Send Notification', 
        description: error.message || 'An error occurred.',
        variant: 'destructive' 
      });
    } finally {
      setNotifyingUserId(null);
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

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(date) <= thirtyDaysFromNow && new Date(date) > new Date();
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const expiredCount = certificates.filter((c) => isExpired(c.expiry_date)).length;
  const expiringSoonCount = certificates.filter((c) => isExpiringSoon(c.expiry_date)).length;
  const totalHoursLogged = hoursSummary.reduce((sum, s) => sum + s.total_hours, 0);

  const filteredCertificates = certificates
    .filter((cert) => {
      const search = searchTerm.toLowerCase();
      return (
        cert.title.toLowerCase().includes(search) ||
        cert.profile?.full_name?.toLowerCase().includes(search) ||
        cert.profile?.email?.toLowerCase().includes(search) ||
        cert.issuing_organization?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const aExpired = isExpired(a.expiry_date);
      const bExpired = isExpired(b.expiry_date);
      const aExpiring = isExpiringSoon(a.expiry_date);
      const bExpiring = isExpiringSoon(b.expiry_date);
      const aPriority = aExpired ? 0 : aExpiring ? 1 : 2;
      const bPriority = bExpired ? 0 : bExpiring ? 1 : 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // Within same priority, sort by expiry date ascending (soonest first)
      if (a.expiry_date && b.expiry_date) return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      if (a.expiry_date) return -1;
      if (b.expiry_date) return 1;
      return 0;
    });

  const handleTimeFilterChange = (start: Date | null, end: Date | null, preset: TimePreset) => {
    setDateRange({ start, end });
    setTimePreset(preset);
  };

  const filteredHours = hoursLog.filter((log) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      log.profile?.full_name?.toLowerCase().includes(search) ||
      log.profile?.email?.toLowerCase().includes(search) ||
      log.category.toLowerCase().includes(search) ||
      log.description?.toLowerCase().includes(search);

    // Apply time filter
    if (dateRange.start && dateRange.end) {
      const logDate = new Date(log.date);
      const matchesDate = isWithinInterval(logDate, { start: dateRange.start, end: dateRange.end });
      return matchesSearch && matchesDate;
    }

    return matchesSearch;
  });

  // Calculate filtered total hours
  const filteredTotalHours = filteredHours.reduce((sum, log) => sum + Number(log.hours), 0);


  const resetAddCertForm = () => {
    setAddCertUserId('');
    setAddCertTitle('');
    setAddCertOrg('');
    setAddCertIssueDate('');
    setAddCertExpiryDate('');
    setAddCertNumber('');
    setAddCertHours('');
    setAddCertNotes('');
    setAddCertFile(null);
    setAddCertDialogOpen(false);
  };

  const handleAddCertForStaff = async () => {
    if (!addCertUserId || !addCertTitle) {
      toast({ title: 'Please select a staff member and provide a title', variant: 'destructive' });
      return;
    }

    setAddCertSaving(true);
    try {
      let fileUrl = null;
      let fileName = null;

      if (addCertFile) {
        const fileExt = addCertFile.name.split('.').pop();
        const filePath = `${addCertUserId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(filePath, addCertFile);
        if (uploadError) throw uploadError;
        fileUrl = filePath;
        fileName = addCertFile.name;
      }

      const { error } = await supabase.from('staff_certificates').insert({
        user_id: addCertUserId,
        title: addCertTitle,
        issuing_organization: addCertOrg || null,
        issue_date: addCertIssueDate || null,
        expiry_date: addCertExpiryDate || null,
        certificate_number: addCertNumber || null,
        file_url: fileUrl,
        file_name: fileName,
        notes: addCertNotes || null,
        hours: addCertHours ? parseFloat(addCertHours) : null,
      } as any);

      if (error) throw error;

      toast({ title: 'Certificate added for staff member' });
      resetAddCertForm();
      fetchData();
    } catch (error: any) {
      console.error('Error adding certificate:', error);
      toast({ title: 'Failed to add certificate', description: error.message, variant: 'destructive' });
    } finally {
      setAddCertSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Certificates & Hours</h1>
          <p className="text-muted-foreground">
            View all staff professional certifications and logged development hours.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 border-brand-lime/30 bg-brand-lime/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
              <Award className="h-4 w-4 text-brand-lime" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificates.length}</div>
              <p className="text-xs text-muted-foreground">Across all staff</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-destructive/30 bg-destructive/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired / Expiring</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiredCount} / {expiringSoonCount}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
              {expiringSoonCount > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 w-full text-xs"
                  onClick={handleSendExpiryNotifications}
                  disabled={sendingNotifications}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  {sendingNotifications ? 'Sending...' : 'Send Reminders'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-cyan/30 bg-brand-cyan/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
              <Clock className="h-4 w-4 text-brand-cyan" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoursLogged.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-purple/30 bg-brand-purple/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Entries</CardTitle>
              <TrendingUp className="h-4 w-4 text-brand-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hoursSummary.reduce((sum, s) => sum + s.entries_count, 0)}</div>
              <p className="text-xs text-muted-foreground">From all sources</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-2"
            />
          </div>
        </div>

        <Tabs defaultValue="certificates">
          <TabsList>
            <TabsTrigger value="certificates">
              <Award className="h-4 w-4 mr-2" />
              Certificates ({filteredCertificates.length})
            </TabsTrigger>
            <TabsTrigger value="hours">
              <Clock className="h-4 w-4 mr-2" />
              Hours Log ({filteredHours.length})
            </TabsTrigger>
            <TabsTrigger value="summary">
              <TrendingUp className="h-4 w-4 mr-2" />
              Hours Summary
            </TabsTrigger>
            <TabsTrigger value="goals">
              <Target className="h-4 w-4 mr-2" />
              Training Goals
            </TabsTrigger>
          </TabsList>

          {/* Certificates Tab */}
          <TabsContent value="certificates">
            <Card className="border-2">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>All Staff Certificates</CardTitle>
                  <CardDescription>
                    Professional certifications and credentials
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={addCertDialogOpen} onOpenChange={(open) => { if (!open) resetAddCertForm(); else setAddCertDialogOpen(true); }}>
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Certificate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border-2 max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Add Certificate for Staff</DialogTitle>
                        <DialogDescription>
                          Add a professional certificate to a staff member's record.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        <div>
                          <Label>Staff Member *</Label>
                          <Select value={addCertUserId} onValueChange={setAddCertUserId}>
                            <SelectTrigger className="border-2">
                              <SelectValue placeholder="Select staff member..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staffList.map((s) => (
                                <SelectItem key={s.user_id} value={s.user_id}>
                                  {s.full_name} ({s.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Certificate Title *</Label>
                          <Input value={addCertTitle} onChange={(e) => setAddCertTitle(e.target.value)} placeholder="e.g., CPR Certification" className="border-2" />
                        </div>
                        <div>
                          <Label>Issuing Organization</Label>
                          <Input value={addCertOrg} onChange={(e) => setAddCertOrg(e.target.value)} placeholder="e.g., American Red Cross" className="border-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Issue Date</Label>
                            <Input type="date" value={addCertIssueDate} onChange={(e) => setAddCertIssueDate(e.target.value)} className="border-2" />
                          </div>
                          <div>
                            <Label>Expiry Date</Label>
                            <Input type="date" value={addCertExpiryDate} onChange={(e) => setAddCertExpiryDate(e.target.value)} className="border-2" />
                          </div>
                        </div>
                        <div>
                          <Label>Certificate Number</Label>
                          <Input value={addCertNumber} onChange={(e) => setAddCertNumber(e.target.value)} placeholder="Optional" className="border-2" />
                        </div>
                        <div>
                          <Label>Training Hours</Label>
                          <Input type="number" step="0.5" min="0" value={addCertHours} onChange={(e) => setAddCertHours(e.target.value)} placeholder="e.g., 8" className="border-2" />
                        </div>
                        <div>
                          <Label>Upload Certificate (PDF, Image)</Label>
                          <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setAddCertFile(e.target.files?.[0] || null)} className="border-2" />
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Textarea value={addCertNotes} onChange={(e) => setAddCertNotes(e.target.value)} placeholder="Any additional notes..." className="border-2" />
                        </div>
                        <Button onClick={handleAddCertForStaff} disabled={addCertSaving} className="w-full">
                          {addCertSaving ? 'Saving...' : 'Add Certificate'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportToCSV(
                        filteredCertificates.map((c) => ({
                          staff_name: c.profile?.full_name,
                          staff_email: c.profile?.email,
                          certificate_title: c.title,
                          issuing_organization: c.issuing_organization,
                          issue_date: c.issue_date,
                          expiry_date: c.expiry_date,
                          certificate_number: c.certificate_number,
                          status: isExpired(c.expiry_date) ? 'Expired' : isExpiringSoon(c.expiry_date) ? 'Expiring Soon' : 'Valid',
                        })),
                        'staff_certificates'
                      )
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const ids = Array.from(new Set(filteredCertificates.map((c) => c.user_id))).filter(Boolean);
                      const qs = ids.length ? `?userIds=${ids.join(',')}` : '';
                      window.open(`/certificates/print${qs}`, '_blank');
                    }}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Download PDF Batch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filteredCertificates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No certificates found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Certificate</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCertificates.map((cert) => (
                        <FragmentRow key={cert.id}>
                        <TableRow>
                          <TableCell>
                            <div>
                              <p className="font-medium">{cert.profile?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{cert.profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{cert.title}</p>
                              {cert.certificate_number && (
                                <p className="text-xs text-muted-foreground">#{cert.certificate_number}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{cert.issuing_organization || '—'}</TableCell>
                          <TableCell>
                            {cert.issue_date ? format(new Date(cert.issue_date), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            {cert.expiry_date ? format(new Date(cert.expiry_date), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            {isExpired(cert.expiry_date) ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : isExpiringSoon(cert.expiry_date) ? (
                              <Badge className="bg-orange-500">Expiring Soon</Badge>
                            ) : cert.expiry_date ? (
                              <Badge variant="secondary" className="bg-brand-lime/20 text-brand-lime border-0">Valid</Badge>
                            ) : (
                              <Badge variant="outline">No Expiry</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {cert.file_url ? (
                                <Button size="sm" variant="ghost" asChild>
                                  <Link to={`/certificate-file/${cert.id}`}>View</Link>
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => { setUpdatingCert(cert); setUpdateDialogOpen(true); }}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Update
                              </Button>
                              {(isExpired(cert.expiry_date) || isExpiringSoon(cert.expiry_date)) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  disabled={notifyingUserId === cert.user_id}
                                  onClick={() => handleSendUserExpiryNotification(cert.user_id, cert.profile?.full_name || 'User')}
                                >
                                  <Mail className="h-3 w-3 mr-1" />
                                  {notifyingUserId === cert.user_id ? 'Sending...' : 'Notify'}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow key={`${cert.id}-history`} className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={7} className="py-0">
                            <PreviousCertificateAccordion certificateId={cert.id} />
                          </TableCell>
                        </TableRow>
                        </FragmentRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hours Log Tab */}
          <TabsContent value="hours">
            <Card className="border-2">
              <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>All Hours Log Entries</CardTitle>
                    <CardDescription>
                      Professional development hours logged by staff
                      {timePreset !== 'all' && (
                        <span className="ml-2 font-medium text-foreground">
                          — {filteredTotalHours.toFixed(1)} hours in selected period
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportToCSV(
                        filteredHours.map((h) => ({
                          staff_name: h.profile?.full_name,
                          staff_email: h.profile?.email,
                          date: h.date,
                          hours: h.hours,
                          category: HOUR_CATEGORIES[h.category] || h.category,
                          description: h.description,
                        })),
                        'staff_hours_log'
                      )
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
                <HoursTimeFilter
                  currentPreset={timePreset}
                  onFilterChange={handleTimeFilterChange}
                  customRange={dateRange}
                />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filteredHours.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No hours logged.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHours.slice(0, 100).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.profile?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{log.profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{format(new Date(log.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-brand-cyan/10 text-brand-cyan border-0">
                              {Number(log.hours).toFixed(1)} hrs
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{HOUR_CATEGORIES[log.category] || log.category}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {log.description || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {filteredHours.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Showing first 100 entries. Export CSV for full data.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hours Summary Tab */}
          <TabsContent value="summary">
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Staff Hours Summary</CardTitle>
                  <CardDescription>
                    Total hours per staff member (manual logs + certificate hours + track completions)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportToCSV(
                      hoursSummary.map((s) => ({
                        name: s.full_name,
                        email: s.email,
                        manual_hours: s.manual_hours.toFixed(1),
                        certificate_hours: s.certificate_hours.toFixed(1),
                        track_completion_hours: s.track_hours.toFixed(1),
                        total_hours: s.total_hours.toFixed(1),
                        this_month_hours: s.this_month_hours.toFixed(1),
                      })),
                      'staff_hours_summary'
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : hoursSummary.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No staff data.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead className="text-center">Manual</TableHead>
                        <TableHead className="text-center">Certificates</TableHead>
                        <TableHead className="text-center">Tracks</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">This Month</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hoursSummary.map((summary) => (
                        <TableRow key={summary.user_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{summary.full_name}</p>
                              <p className="text-xs text-muted-foreground">{summary.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {summary.manual_hours > 0 ? (
                              <Badge variant="outline" className="text-xs">
                                {summary.manual_hours.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {summary.certificate_hours > 0 ? (
                              <Badge variant="outline" className="text-xs bg-accent/50">
                                {summary.certificate_hours.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {summary.track_hours > 0 ? (
                              <Badge variant="outline" className="text-xs bg-accent/50">
                                {summary.track_hours.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-brand-lime/10 text-brand-lime border-0">
                              {summary.total_hours.toFixed(1)} hrs
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-brand-purple/10 text-brand-purple border-0">
                              {summary.this_month_hours.toFixed(1)} hrs
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Goals Tab */}
          <TabsContent value="goals">
            <Card className="border-2">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-brand-purple" />
                    Annual Training Goals ({currentYear})
                  </CardTitle>
                  <CardDescription>
                    Set required training hours per staff member for the current year
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : hoursSummary.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No staff data.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead className="text-center">Required Hours</TableHead>
                        <TableHead className="text-center">Logged Hours ({currentYear})</TableHead>
                        <TableHead className="text-center">Progress</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hoursSummary.map((summary) => {
                        const progressPercent = summary.required_hours > 0 
                          ? Math.min(100, (summary.total_hours / summary.required_hours) * 100)
                          : 0;
                        const isComplete = summary.required_hours > 0 && summary.total_hours >= summary.required_hours;
                        
                        return (
                          <TableRow key={summary.user_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{summary.full_name}</p>
                                <p className="text-xs text-muted-foreground">{summary.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {summary.required_hours > 0 ? (
                                <Badge variant="outline" className="bg-brand-purple/10 text-brand-purple border-0">
                                  {summary.required_hours} hrs
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not set</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-brand-lime/10 text-brand-lime border-0">
                                {summary.total_hours.toFixed(1)} hrs
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {summary.required_hours > 0 ? (
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={progressPercent} 
                                    className="w-24 h-2"
                                  />
                                  <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : ''}`}>
                                    {progressPercent.toFixed(0)}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditGoal(summary)}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Set Goal
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Goal Dialog */}
        <Dialog open={editGoalDialogOpen} onOpenChange={setEditGoalDialogOpen}>
          <DialogContent className="border-2 max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-purple" />
                Set Training Goal
              </DialogTitle>
              <DialogDescription>
                Set required annual training hours for {editingUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal-hours">Required Hours for {currentYear}</Label>
                <Input
                  id="goal-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={goalHours}
                  onChange={(e) => setGoalHours(e.target.value)}
                  placeholder="e.g., 40"
                  className="border-2 mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter 0 to remove the goal requirement.
                </p>
              </div>
              {editingUser && editingUser.total_hours > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">{editingUser.full_name}</span> has logged{' '}
                    <span className="font-medium text-brand-lime">{editingUser.total_hours.toFixed(1)} hours</span>{' '}
                    this year.
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditGoalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveGoal} disabled={savingGoal}>
                  {savingGoal ? 'Saving...' : 'Save Goal'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <UpdateCertificateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          certificate={updatingCert}
          onUpdated={fetchData}
        />
      </div>
    </Layout>
  );
}
