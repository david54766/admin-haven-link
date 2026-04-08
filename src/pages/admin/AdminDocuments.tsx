import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, CheckCircle, AlertTriangle, Upload, Download, Eye, FolderDown } from 'lucide-react';
import { SharedResourcesManager } from '@/components/admin/SharedResourcesManager';
import { format } from 'date-fns';

interface SharedResource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  is_important: boolean;
}

interface DocSubmission {
  id: string;
  user_id: string;
  resource_id: string;
  file_url: string;
  file_name: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
}

interface StaffProfile {
  user_id: string;
  full_name: string;
  email: string;
  center_id: string | null;
}

interface Center {
  id: string;
  name: string;
}

export default function AdminDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Documents tab state
  const [requiredResources, setRequiredResources] = useState<SharedResource[]>([]);
  const [submissions, setSubmissions] = useState<DocSubmission[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'missing' | 'submitted'>('all');
  const [filterCenter, setFilterCenter] = useState('all');

  // Upload on behalf dialog
  const [uploadDialog, setUploadDialog] = useState<{ staffUser: StaffProfile; resource: SharedResource } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // View submission dialog
  const [viewSubmission, setViewSubmission] = useState<DocSubmission | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [resourcesRes, submissionsRes, staffRes, centersRes] = await Promise.all([
        supabase.from('shared_resources').select('id, title, description, file_url, file_name, is_important').eq('is_important', true).order('title'),
        supabase.from('important_document_submissions').select('*'),
        supabase.from('profiles').select('user_id, full_name, email, center_id').eq('status', 'approved').order('full_name'),
        supabase.from('centers').select('id, name').order('name'),
      ]);

      if (resourcesRes.error) throw resourcesRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (staffRes.error) throw staffRes.error;

      setRequiredResources(resourcesRes.data || []);
      setSubmissions((submissionsRes.data || []) as DocSubmission[]);
      setStaffList(staffRes.data || []);
      setCenters(centersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Document helpers ----
  const getDocSubmission = (userId: string, resourceId: string) => {
    return submissions.find(s => s.user_id === userId && s.resource_id === resourceId);
  };

  const getStaffSubmissionCount = (userId: string) => {
    return requiredResources.filter(r => getDocSubmission(userId, r.id)).length;
  };

  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = !searchQuery ||
      staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCenter = filterCenter === 'all' || staff.center_id === filterCenter;
    if (!matchesSearch || !matchesCenter) return false;
    if (filterStatus === 'missing') return getStaffSubmissionCount(staff.user_id) < requiredResources.length;
    if (filterStatus === 'submitted') return getStaffSubmissionCount(staff.user_id) === requiredResources.length;
    return true;
  });

  const totalMissing = staffList.reduce((sum, staff) => sum + (requiredResources.length - getStaffSubmissionCount(staff.user_id)), 0);
  const totalSubmitted = submissions.length;
  const fullyCompliant = staffList.filter(s => getStaffSubmissionCount(s.user_id) === requiredResources.length).length;

  const handleUploadOnBehalf = async () => {
    if (!uploadFile || !uploadDialog || !user) return;
    setIsUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const filePath = `${uploadDialog.staffUser.user_id}/important/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, uploadFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      const { error: insertError } = await supabase.from('important_document_submissions').insert({
        user_id: uploadDialog.staffUser.user_id,
        resource_id: uploadDialog.resource.id,
        file_url: urlData.publicUrl,
        file_name: uploadFile.name,
      });
      if (insertError) throw insertError;
      toast({ title: 'Document Uploaded', description: `Uploaded "${uploadDialog.resource.title}" for ${uploadDialog.staffUser.full_name}.` });
      setUploadDialog(null);
      setUploadFile(null);
      fetchAll();
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50">
              <FileText className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-foreground">Admin</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Documents & Resources</h1>
          <p className="text-muted-foreground mt-1">
            Manage shared resources and track required document submissions.
          </p>
        </div>

        <Tabs defaultValue="resources" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="resources" className="text-xs sm:text-sm">
              <FolderDown className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Share & Request</span>
              <span className="sm:hidden">Share</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 sm:mr-2" />
              Required Docs
            </TabsTrigger>
          </TabsList>

          {/* ========== SHARED RESOURCES TAB ========== */}
          <TabsContent value="resources" className="space-y-6">
            <SharedResourcesManager />
          </TabsContent>

          {/* ========== REQUIRED DOCUMENTS TAB ========== */}
          <TabsContent value="documents" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardDescription>Required Documents</CardDescription>
                  <CardTitle className="text-2xl">{requiredResources.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardDescription>Total Submissions</CardDescription>
                  <CardTitle className="text-2xl">{totalSubmitted}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardDescription>Missing Submissions</CardDescription>
                  <CardTitle className="text-2xl text-destructive">{totalMissing}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardDescription>Fully Compliant Staff</CardDescription>
                  <CardTitle className="text-2xl text-primary">{fullyCompliant} / {staffList.length}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="border-2">
              <CardContent className="flex flex-wrap items-center gap-4 py-4">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border-2" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Status:</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                    <SelectTrigger className="w-[150px] border-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      <SelectItem value="missing">Missing Docs</SelectItem>
                      <SelectItem value="submitted">Fully Compliant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {centers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Center:</Label>
                    <Select value={filterCenter} onValueChange={setFilterCenter}>
                      <SelectTrigger className="w-[150px] border-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Centers</SelectItem>
                        {centers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {requiredResources.length === 0 ? (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Required Documents</h3>
                  <p className="text-muted-foreground">Mark shared resources as "Important" in the Resources & Documents tab to require staff submissions.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Staff Document Checklist</CardTitle>
                  <CardDescription>{filteredStaff.length} staff member(s) · {requiredResources.length} required document(s)</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Staff Member</TableHead>
                        {requiredResources.map(r => (
                          <TableHead key={r.id} className="text-center min-w-[140px]"><span className="text-xs">{r.title}</span></TableHead>
                        ))}
                        <TableHead className="text-center">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={requiredResources.length + 2} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                      ) : filteredStaff.length === 0 ? (
                        <TableRow><TableCell colSpan={requiredResources.length + 2} className="text-center py-8 text-muted-foreground">No staff found matching filters.</TableCell></TableRow>
                      ) : (
                        filteredStaff.map(staff => {
                          const submitted = getStaffSubmissionCount(staff.user_id);
                          const total = requiredResources.length;
                          return (
                            <TableRow key={staff.user_id}>
                              <TableCell className="sticky left-0 bg-background z-10">
                                <div>
                                  <p className="font-medium text-sm">{staff.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{staff.email}</p>
                                </div>
                              </TableCell>
                              {requiredResources.map(resource => {
                                const sub = getDocSubmission(staff.user_id, resource.id);
                                return (
                                  <TableCell key={resource.id} className="text-center">
                                    {sub ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setViewSubmission(sub)}>
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10 hover:text-primary" onClick={() => setUploadDialog({ staffUser: staff, resource })} title="Upload on behalf">
                                          <Upload className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center">
                                <Badge variant={submitted === total ? 'default' : 'secondary'}>{submitted}/{total}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload On Behalf Dialog */}
      <Dialog open={!!uploadDialog} onOpenChange={(open) => { if (!open) { setUploadDialog(null); setUploadFile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload on Behalf of Staff</DialogTitle>
            <DialogDescription>Upload "{uploadDialog?.resource.title}" for {uploadDialog?.staffUser.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="behalf-file">Select File *</Label>
              <Input id="behalf-file" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="border-2" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialog(null); setUploadFile(null); }}>Cancel</Button>
            <Button onClick={handleUploadOnBehalf} disabled={!uploadFile || isUploading}>{isUploading ? 'Uploading...' : 'Upload Document'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Doc Submission Dialog */}
      <Dialog open={!!viewSubmission} onOpenChange={(open) => { if (!open) setViewSubmission(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submission Details</DialogTitle></DialogHeader>
          {viewSubmission && (
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">File Name</Label>
                <p className="text-sm font-medium">{viewSubmission.file_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Submitted</Label>
                <p className="text-sm">{format(new Date(viewSubmission.submitted_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <Badge variant="outline" className="ml-2">{viewSubmission.status}</Badge>
              </div>
              <Button asChild className="w-full">
                <a href={viewSubmission.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />Download File
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
