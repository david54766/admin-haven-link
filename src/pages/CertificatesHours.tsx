import { useEffect, useState, Fragment as FragmentRow } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Award, Clock, Plus, Trash2, Download, Calendar, FileText, TrendingUp, Target, Pencil, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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
}

interface HoursLog {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  category: string;
  description: string | null;
  created_at: string;
}

interface TrackCertificate {
  id: string;
  user_id: string;
  track_title: string;
  module_title?: string | null;
  hours_earned: number;
  issued_at: string;
  certificate_number?: string | null;
  expiry_date?: string | null;
  source?: 'track' | 'module';
}

interface UnifiedHoursEntry {
  id: string;
  date: string;
  hours: number;
  source: 'manual' | 'certificate' | 'track_completion';
  description: string;
  category: string;
  deletable: boolean;
}

const HOUR_CATEGORIES = [
  { value: 'training', label: 'Training' },
  { value: 'professional_development', label: 'Professional Development' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'conference', label: 'Conference' },
  { value: 'mentoring', label: 'Mentoring' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'other', label: 'Other' },
];

interface TrainingGoal {
  id: string;
  required_hours: number;
  year: number;
}

export default function CertificatesHours() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [hoursLog, setHoursLog] = useState<HoursLog[]>([]);
  const [trackCertificates, setTrackCertificates] = useState<TrackCertificate[]>([]);
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  
  // Certificate form
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [updatingCert, setUpdatingCert] = useState<Certificate | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [certUploading, setCertUploading] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certNotes, setCertNotes] = useState('');
  const [certHours, setCertHours] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  
  // Hours form
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [hoursSubmitting, setHoursSubmitting] = useState(false);
  const [hoursDate, setHoursDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hoursAmount, setHoursAmount] = useState('');
  const [hoursCategory, setHoursCategory] = useState('training');
  const [hoursDescription, setHoursDescription] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [certRes, hoursRes, goalRes, trackCertRes, moduleCertRes] = await Promise.all([
        supabase
          .from('staff_certificates')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('staff_hours_log')
          .select('*')
          .eq('user_id', user!.id)
          .order('date', { ascending: false }),
        supabase
          .from('staff_training_goals')
          .select('*')
          .eq('user_id', user!.id)
          .eq('year', currentYear)
          .maybeSingle(),
        supabase
          .from('track_certificates')
          .select('id, user_id, track_title, hours_earned, issued_at, certificate_number, expiry_date')
          .eq('user_id', user!.id)
          .order('issued_at', { ascending: false }),
        supabase
          .from('module_certificates')
          .select('id, user_id, track_title, module_title, hours_earned, issued_at, certificate_number, expiry_date')
          .eq('user_id', user!.id)
          .order('issued_at', { ascending: false }),
      ]);

      setCertificates((certRes.data || []) as Certificate[]);
      setHoursLog((hoursRes.data || []) as HoursLog[]);
      const tracks = ((trackCertRes.data || []) as any[]).map((t) => ({ ...t, source: 'track' as const }));
      const mods = ((moduleCertRes.data || []) as any[]).map((m) => ({ ...m, source: 'module' as const }));
      setTrackCertificates([...tracks, ...mods] as TrackCertificate[]);
      setTrainingGoal(goalRes.data as TrainingGoal | null);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCertificate = async () => {
    if (!certTitle) {
      toast({ title: 'Please provide a certificate title', variant: 'destructive' });
      return;
    }

    setCertUploading(true);

    try {
      let fileUrl = editingCert?.file_url || null;
      let fileName = editingCert?.file_name || null;

      if (certFile) {
        // Remove old file if replacing
        if (editingCert?.file_url) {
          await supabase.storage.from('certificates').remove([editingCert.file_url]);
        }

        const fileExt = certFile.name.split('.').pop();
        const filePath = `${user!.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(filePath, certFile);

        if (uploadError) throw uploadError;

        fileUrl = filePath;
        fileName = certFile.name;
      }

      const certData = {
        title: certTitle,
        issuing_organization: certOrg || null,
        issue_date: certIssueDate || null,
        expiry_date: certExpiryDate || null,
        certificate_number: certNumber || null,
        file_url: fileUrl,
        file_name: fileName,
        notes: certNotes || null,
        hours: certHours ? parseFloat(certHours) : null,
      };

      if (editingCert) {
        const { error } = await supabase
          .from('staff_certificates')
          .update(certData as any)
          .eq('id', editingCert.id);
        if (error) throw error;
        toast({ title: 'Certificate updated successfully!' });
      } else {
        const { error } = await supabase.from('staff_certificates').insert({
          ...certData,
          user_id: user!.id,
        } as any);
        if (error) throw error;
        toast({ title: 'Certificate added successfully!' });
      }

      resetCertForm();
      fetchData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Failed to save certificate', description: error.message, variant: 'destructive' });
    } finally {
      setCertUploading(false);
    }
  };

  const handleDeleteCertificate = async (cert: Certificate) => {
    if (!confirm('Are you sure you want to delete this certificate?')) return;

    try {
      if (cert.file_url) {
        const urlParts = cert.file_url.split('/');
        const filePath = urlParts.slice(-2).join('/');
        await supabase.storage.from('certificates').remove([filePath]);
      }

      const { error } = await supabase
        .from('staff_certificates')
        .delete()
        .eq('id', cert.id);

      if (error) throw error;
      toast({ title: 'Certificate deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    }
  };

  const handleLogHours = async () => {
    if (!hoursAmount || !hoursDate) {
      toast({ title: 'Please provide date and hours', variant: 'destructive' });
      return;
    }

    setHoursSubmitting(true);

    try {
      const { error } = await supabase.from('staff_hours_log').insert({
        user_id: user!.id,
        date: hoursDate,
        hours: parseFloat(hoursAmount),
        category: hoursCategory,
        description: hoursDescription || null,
      });

      if (error) throw error;

      toast({ title: 'Hours logged successfully!' });
      resetHoursForm();
      fetchData();
    } catch (error: any) {
      console.error('Log error:', error);
      toast({ title: 'Failed to log hours', description: error.message, variant: 'destructive' });
    } finally {
      setHoursSubmitting(false);
    }
  };

  const handleDeleteHours = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('staff_hours_log')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Hours entry deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    }
  };

  const resetCertForm = () => {
    setCertTitle('');
    setCertOrg('');
    setCertIssueDate('');
    setCertExpiryDate('');
    setCertNumber('');
    setCertNotes('');
    setCertHours('');
    setCertFile(null);
    setEditingCert(null);
    setCertDialogOpen(false);
  };

  const openEditCert = (cert: Certificate) => {
    setEditingCert(cert);
    setCertTitle(cert.title);
    setCertOrg(cert.issuing_organization || '');
    setCertIssueDate(cert.issue_date || '');
    setCertExpiryDate(cert.expiry_date || '');
    setCertNumber(cert.certificate_number || '');
    setCertNotes(cert.notes || '');
    setCertHours(cert.hours ? String(cert.hours) : '');
    setCertFile(null);
    setCertDialogOpen(true);
  };

  const resetHoursForm = () => {
    setHoursDate(format(new Date(), 'yyyy-MM-dd'));
    setHoursAmount('');
    setHoursCategory('training');
    setHoursDescription('');
    setHoursDialogOpen(false);
  };

  // Build unified hours feed from all sources
  const unifiedFeed: UnifiedHoursEntry[] = [
    // Manual hours
    ...hoursLog.map((log) => ({
      id: `manual-${log.id}`,
      date: log.date,
      hours: Number(log.hours),
      source: 'manual' as const,
      description: log.description || 'Manual hours logged',
      category: HOUR_CATEGORIES.find((c) => c.value === log.category)?.label || log.category,
      deletable: true,
      _originalId: log.id,
    })),
    // Certificate hours
    ...certificates
      .filter((cert) => (cert as any).hours && Number((cert as any).hours) > 0)
      .map((cert) => ({
        id: `cert-${cert.id}`,
        date: cert.issue_date || cert.created_at.split('T')[0],
        hours: Number((cert as any).hours),
        source: 'certificate' as const,
        description: `Certificate: ${cert.title}${cert.issuing_organization ? ` (${cert.issuing_organization})` : ''}`,
        category: 'Certificate',
        deletable: false,
      })),
    // Track completion hours
    ...trackCertificates
      .filter((tc) => tc.hours_earned > 0)
      .map((tc) => ({
        id: `track-${tc.id}`,
        date: tc.issued_at.split('T')[0],
        hours: Number(tc.hours_earned),
        source: 'track_completion' as const,
        description: `Completed track: ${tc.track_title}`,
        category: 'Track Completion',
        deletable: false,
      })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate total hours from unified feed
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31);
  
  const thisYearHours = unifiedFeed
    .filter((entry) => {
      const d = new Date(entry.date);
      return d >= yearStart && d <= yearEnd;
    })
    .reduce((sum, entry) => sum + entry.hours, 0);
    
  const totalHours = unifiedFeed.reduce((sum, entry) => sum + entry.hours, 0);
  const thisMonthHours = unifiedFeed
    .filter((entry) => {
      const d = new Date(entry.date);
      return d >= startOfMonth(new Date()) && d <= endOfMonth(new Date());
    })
    .reduce((sum, entry) => sum + entry.hours, 0);
  const lastMonthHours = unifiedFeed
    .filter((entry) => {
      const d = new Date(entry.date);
      const lastMonth = subMonths(new Date(), 1);
      return d >= startOfMonth(lastMonth) && d <= endOfMonth(lastMonth);
    })
    .reduce((sum, entry) => sum + entry.hours, 0);
    
  // Goal progress
  const goalProgress = trainingGoal && trainingGoal.required_hours > 0
    ? Math.min(100, (thisYearHours / trainingGoal.required_hours) * 100)
    : 0;
  const hoursRemaining = trainingGoal && trainingGoal.required_hours > 0
    ? Math.max(0, trainingGoal.required_hours - thisYearHours)
    : 0;

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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50">
              <Award className="h-3 w-3 text-brand-green" />
              <span className="text-xs font-medium text-foreground">Professional Growth</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Certificates & Hours</h1>
          <p className="text-muted-foreground mt-1">
            Track your professional certifications and log development hours.
          </p>
        </div>

        <Tabs defaultValue="certificates" className="space-y-6">
          <TabsList className="bg-accent/50 p-1">
            <TabsTrigger value="certificates" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Award className="h-4 w-4 mr-2" />
              Certificates
            </TabsTrigger>
            <TabsTrigger value="hours" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clock className="h-4 w-4 mr-2" />
              Hours Log
            </TabsTrigger>
          </TabsList>

          {/* Certificates Tab */}
          <TabsContent value="certificates" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={certDialogOpen} onOpenChange={(open) => { if (!open) resetCertForm(); else setCertDialogOpen(true); }}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Certificate
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-2 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-xl">{editingCert ? 'Edit Certificate' : 'Add Certificate'}</DialogTitle>
                    <DialogDescription>
                      {editingCert ? 'Update this certificate\'s details.' : 'Record a new professional certificate or credential.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div>
                      <Label htmlFor="cert-title">Certificate Title *</Label>
                      <Input
                        id="cert-title"
                        value={certTitle}
                        onChange={(e) => setCertTitle(e.target.value)}
                        placeholder="e.g., CPR Certification"
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cert-org">Issuing Organization</Label>
                      <Input
                        id="cert-org"
                        value={certOrg}
                        onChange={(e) => setCertOrg(e.target.value)}
                        placeholder="e.g., American Red Cross"
                        className="border-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="cert-issue">Issue Date</Label>
                        <Input
                          id="cert-issue"
                          type="date"
                          value={certIssueDate}
                          onChange={(e) => setCertIssueDate(e.target.value)}
                          className="border-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cert-expiry">Expiry Date</Label>
                        <Input
                          id="cert-expiry"
                          type="date"
                          value={certExpiryDate}
                          onChange={(e) => setCertExpiryDate(e.target.value)}
                          className="border-2"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cert-number">Certificate Number</Label>
                      <Input
                        id="cert-number"
                        value={certNumber}
                        onChange={(e) => setCertNumber(e.target.value)}
                        placeholder="Optional"
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cert-hours">Training Hours</Label>
                      <Input
                        id="cert-hours"
                        type="number"
                        step="0.5"
                        min="0"
                        value={certHours}
                        onChange={(e) => setCertHours(e.target.value)}
                        placeholder="e.g., 8"
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cert-file">{editingCert?.file_name ? `Current file: ${editingCert.file_name} (upload to replace)` : 'Upload Certificate (PDF, Image)'}</Label>
                      <Input
                        id="cert-file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                        className="border-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cert-notes">Notes</Label>
                      <Textarea
                        id="cert-notes"
                        value={certNotes}
                        onChange={(e) => setCertNotes(e.target.value)}
                        placeholder="Any additional notes..."
                        className="border-2"
                      />
                    </div>
                    <Button onClick={handleUploadCertificate} disabled={certUploading} className="w-full">
                      {certUploading ? 'Saving...' : editingCert ? 'Update Certificate' : 'Add Certificate'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-green/10">
                    <Award className="h-5 w-5 text-brand-green" />
                  </div>
                  <div>
                    <CardTitle>My Certificates</CardTitle>
                    <CardDescription>{certificates.length} certificate(s) on file</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : certificates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mb-4">
                      <Award className="h-8 w-8 text-brand-green" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
                    <p className="text-muted-foreground">Add your first certificate to track your credentials.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Certificate</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.map((cert) => (
                        <FragmentRow key={cert.id}>
                        <TableRow className="hover:bg-accent/30">
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
                            {cert.expiry_date ? (
                              <span className={
                                isExpired(cert.expiry_date) 
                                  ? 'text-destructive font-medium' 
                                  : isExpiringSoon(cert.expiry_date) 
                                    ? 'text-orange-500 font-medium'
                                    : ''
                              }>
                                {format(new Date(cert.expiry_date), 'MMM d, yyyy')}
                                {isExpired(cert.expiry_date) && ' ❌'}
                                {isExpiringSoon(cert.expiry_date) && !isExpired(cert.expiry_date) && ' ⚠️'}
                              </span>
                            ) : (
                              <Badge variant="secondary">No expiry</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(cert as any).hours ? (
                              <Badge variant="outline">{(cert as any).hours}h</Badge>
                            ) : '—'}
                          </TableCell>
                           <TableCell className="text-right">
                            <div className="flex justify-end gap-1 flex-wrap">
                              {cert.file_url && (
                                <Button size="icon" variant="ghost" className="hover:bg-brand-blue/10 hover:text-brand-blue" asChild>
                                  <Link to={`/certificate-file/${cert.id}`}>
                                    <Download className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => { setUpdatingCert(cert as any); setUpdateDialogOpen(true); }}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Update
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="hover:bg-brand-blue/10 hover:text-brand-blue"
                                onClick={() => openEditCert(cert)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteCertificate(cert)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={6} className="py-0">
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

          {/* Hours Tab */}
          <TabsContent value="hours" className="space-y-6">
            {/* Annual Goal Progress */}
            {trainingGoal && trainingGoal.required_hours > 0 && (
              <Card className="border-2 border-brand-purple/30 bg-gradient-to-r from-brand-purple/5 to-brand-green/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-purple/10">
                      <Target className="h-5 w-5 text-brand-purple" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{currentYear} Training Goal</CardTitle>
                      <CardDescription>
                        {thisYearHours.toFixed(1)} of {trainingGoal.required_hours} hours completed
                      </CardDescription>
                    </div>
                  </div>
                  {goalProgress >= 100 ? (
                    <Badge className="bg-green-500 text-white">Complete!</Badge>
                  ) : (
                    <Badge variant="outline" className="text-brand-purple border-brand-purple/30">
                      {hoursRemaining.toFixed(1)} hrs remaining
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <Progress value={goalProgress} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2 text-right">
                    {goalProgress.toFixed(0)}% complete
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2 border-brand-blue/30 bg-brand-blue/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <div className="p-2 rounded-lg bg-brand-blue/10">
                    <Calendar className="h-4 w-4 text-brand-blue" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{thisMonthHours.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">hours logged</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-brand-purple/30 bg-brand-purple/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Month</CardTitle>
                  <div className="p-2 rounded-lg bg-brand-purple/10">
                    <TrendingUp className="h-4 w-4 text-brand-purple" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{lastMonthHours.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">hours logged</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-brand-green/30 bg-brand-green/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{currentYear} Total</CardTitle>
                  <div className="p-2 rounded-lg bg-brand-green/10">
                    <Clock className="h-4 w-4 text-brand-green" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{thisYearHours.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">hours this year</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                    <Plus className="mr-2 h-4 w-4" />
                    Log Hours
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-2">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Log Hours</DialogTitle>
                    <DialogDescription>
                      Record professional development or training hours.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="hours-date">Date *</Label>
                        <Input
                          id="hours-date"
                          type="date"
                          value={hoursDate}
                          onChange={(e) => setHoursDate(e.target.value)}
                          className="border-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hours-amount">Hours *</Label>
                        <Input
                          id="hours-amount"
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={hoursAmount}
                          onChange={(e) => setHoursAmount(e.target.value)}
                          placeholder="e.g., 2.5"
                          className="border-2"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="hours-category">Category</Label>
                      <Select value={hoursCategory} onValueChange={setHoursCategory}>
                        <SelectTrigger className="border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOUR_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="hours-desc">Description</Label>
                      <Textarea
                        id="hours-desc"
                        value={hoursDescription}
                        onChange={(e) => setHoursDescription(e.target.value)}
                        placeholder="What did you work on?"
                        className="border-2"
                      />
                    </div>
                    <Button onClick={handleLogHours} disabled={hoursSubmitting} className="w-full">
                      {hoursSubmitting ? 'Logging...' : 'Log Hours'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-blue/10">
                    <Clock className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div>
                    <CardTitle>Hours Feed</CardTitle>
                    <CardDescription>{unifiedFeed.length} entries from all sources</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : unifiedFeed.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 rounded-full bg-brand-blue/20 flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-brand-blue" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Hours Logged</h3>
                    <p className="text-muted-foreground">Hours will appear here from certificates, training tracks, and manual entries.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unifiedFeed.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            entry.source === 'manual' 
                              ? 'bg-brand-blue/10' 
                              : entry.source === 'certificate' 
                                ? 'bg-brand-green/10'
                                : 'bg-primary/10'
                          }`}>
                            {entry.source === 'manual' ? (
                              <Clock className={`h-4 w-4 text-brand-blue`} />
                            ) : entry.source === 'certificate' ? (
                              <Award className={`h-4 w-4 text-brand-green`} />
                            ) : (
                              <FileText className={`h-4 w-4 text-primary`} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{entry.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.date), 'MMM d, yyyy')}
                              </span>
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                                {entry.category}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Badge variant="secondary" className="bg-brand-green/10 text-brand-green border-0 font-semibold">
                            {entry.hours.toFixed(1)} hrs
                          </Badge>
                          {entry.deletable && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDeleteHours((entry as any)._originalId || entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <UpdateCertificateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          certificate={updatingCert as any}
          onUpdated={fetchData}
        />
      </div>
    </Layout>
  );
}
