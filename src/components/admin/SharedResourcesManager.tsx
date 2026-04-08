import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, FolderDown, FileText, Download, Link, ExternalLink, AlertTriangle, ClipboardCheck, CheckCircle, XCircle, User, Upload, PenLine } from 'lucide-react';
import easyfillLogo from '@/assets/easyfill-logo.png';
import { isEasyFillUrl } from '@/components/documents/EasyFillViewer';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SharedResource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  category: string;
  download_count: number;
  created_at: string;
  link_url: string | null;
  is_important: boolean;
}

interface ImportantDocSubmission {
  id: string;
  user_id: string;
  resource_id: string;
  file_url: string;
  file_name: string;
  submitted_at: string;
  status: string;
}

interface StaffProfile {
  user_id: string;
  full_name: string;
  email: string;
}

const CATEGORIES = ['general', 'forms', 'policies', 'templates', 'training'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export function SharedResourcesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resourceType, setResourceType] = useState<'file' | 'link' | 'upload_only' | 'easyfill'>('file');
  const [easyfillUrl, setEasyfillUrl] = useState('');
  const [showChecklist, setShowChecklist] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadLinkUrl, setUploadLinkUrl] = useState('');
  const [uploadIsImportant, setUploadIsImportant] = useState(false);

  // Checklist state
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [submissions, setSubmissions] = useState<ImportantDocSubmission[]>([]);
  const [isChecklistLoading, setIsChecklistLoading] = useState(false);

  // Admin upload on behalf of staff
  const [adminUploadDialog, setAdminUploadDialog] = useState<{ staffUserId: string; staffName: string; resource: SharedResource } | null>(null);
  const [adminUploadFile, setAdminUploadFile] = useState<File | null>(null);
  const [isAdminUploading, setIsAdminUploading] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChecklistData = async () => {
    setIsChecklistLoading(true);
    try {
      const [profilesRes, submissionsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email').eq('status', 'approved'),
        supabase.from('important_document_submissions').select('*'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (submissionsRes.error) throw submissionsRes.error;

      setStaffProfiles(profilesRes.data || []);
      setSubmissions(submissionsRes.data || []);
    } catch (error) {
      console.error('Error fetching checklist data:', error);
    } finally {
      setIsChecklistLoading(false);
    }
  };

  const handleToggleChecklist = () => {
    const next = !showChecklist;
    setShowChecklist(next);
    if (next) fetchChecklistData();
  };

  const handleAdminUploadForStaff = async () => {
    if (!adminUploadFile || !adminUploadDialog) return;

    setIsAdminUploading(true);
    try {
      const fileExt = adminUploadFile.name.split('.').pop();
      const filePath = `${adminUploadDialog.staffUserId}/important/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, adminUploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('important_document_submissions')
        .insert({
          user_id: adminUploadDialog.staffUserId,
          resource_id: adminUploadDialog.resource.id,
          file_url: urlData.publicUrl,
          file_name: adminUploadFile.name,
        });

      if (insertError) throw insertError;

      toast({ title: 'Document Submitted', description: `Document submitted on behalf of ${adminUploadDialog.staffName}.` });
      setAdminUploadDialog(null);
      setAdminUploadFile(null);
      fetchChecklistData();
    } catch (error: any) {
      console.error('Admin upload error:', error);
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsAdminUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadTitle.trim()) {
      toast({ title: 'Missing Information', description: 'Please provide a title.', variant: 'destructive' });
      return;
    }

    if (resourceType === 'file' && !uploadFile) {
      toast({ title: 'Missing Information', description: 'Please select a file.', variant: 'destructive' });
      return;
    }

    if (resourceType === 'link' && !uploadLinkUrl.trim()) {
      toast({ title: 'Missing Information', description: 'Please provide a link URL.', variant: 'destructive' });
      return;
    }

    if (resourceType === 'easyfill') {
      if (!easyfillUrl.trim()) {
        toast({ title: 'Missing Information', description: 'Please provide an EasyFill.ai form URL.', variant: 'destructive' });
        return;
      }
      if (!isEasyFillUrl(easyfillUrl.trim())) {
        toast({ title: 'Invalid URL', description: 'URL must be from easyfill.ai (e.g. https://app.easyfill.ai/pdf-form/fill/...)', variant: 'destructive' });
        return;
      }
    }

    if (resourceType === 'file' && uploadFile && uploadFile.size > MAX_FILE_SIZE_BYTES) {
      toast({ title: 'File Too Large', description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Your file is ${formatFileSize(uploadFile.size)}.`, variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      let fileUrl = '';
      let fileName = '';

      if (resourceType === 'file' && uploadFile) {
        const fileExt = uploadFile.name.split('.').pop();
        const filePath = `shared/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('shared-resources')
          .upload(filePath, uploadFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('shared-resources')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = uploadFile.name;
      }

      const { error: insertError } = await supabase.from('shared_resources').insert({
        title: uploadTitle.trim(),
        description: uploadDescription.trim() || null,
        file_url: resourceType === 'upload_only' ? 'upload_only' : resourceType === 'easyfill' ? 'easyfill' : fileUrl,
        file_name: resourceType === 'upload_only' ? 'upload_only' : resourceType === 'easyfill' ? 'easyfill' : fileName,
        category: resourceType === 'easyfill' ? 'forms' : uploadCategory,
        uploaded_by: user?.id,
        link_url: resourceType === 'link' ? uploadLinkUrl.trim() : resourceType === 'easyfill' ? easyfillUrl.trim() : null,
        is_important: resourceType === 'upload_only' ? true : uploadIsImportant,
      });

      if (insertError) throw insertError;

      toast({
        title: resourceType === 'file' ? 'Resource Uploaded' : resourceType === 'link' ? 'Link Added' : 'Upload Requirement Added',
        description: 'Staff can now access this resource.',
      });

      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('general');
      setUploadLinkUrl('');
      setEasyfillUrl('');
      setResourceType('file');
      setUploadIsImportant(false);
      setIsDialogOpen(false);
      fetchResources();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload Failed', description: error.message || 'There was an error uploading the resource.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (resource: SharedResource) => {
    if (!confirm(`Delete "${resource.title}"? Staff will no longer be able to access it.`)) return;

    try {
      if (resource.file_url && !resource.link_url) {
        const urlParts = resource.file_url.split('/');
        const filePath = `shared/${urlParts[urlParts.length - 1]}`;
        await supabase.storage.from('shared-resources').remove([filePath]);
      }

      const { error } = await supabase
        .from('shared_resources')
        .delete()
        .eq('id', resource.id);

      if (error) throw error;

      toast({ title: 'Resource deleted' });
      fetchResources();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'forms': return 'bg-brand-purple/10 text-brand-purple';
      case 'policies': return 'bg-brand-blue/10 text-brand-blue';
      case 'templates': return 'bg-brand-yellow/10 text-brand-yellow';
      case 'training': return 'bg-brand-red/10 text-brand-red';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const importantResources = resources.filter(r => r.is_important);

  const getSubmissionForStaff = (userId: string, resourceId: string) => {
    return submissions.find(s => s.user_id === userId && s.resource_id === resourceId);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderDown className="h-5 w-5" />
                Shared Resources
              </CardTitle>
              <CardDescription>
                Add documents or links for staff to access and complete.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {importantResources.length > 0 && (
                <Button variant={showChecklist ? 'default' : 'outline'} onClick={handleToggleChecklist}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Staff Checklist
                </Button>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Shared Resource</DialogTitle>
                    <DialogDescription>
                      Add a file or link for all staff to access.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs value={resourceType} onValueChange={(v) => setResourceType(v as 'file' | 'link' | 'upload_only' | 'easyfill')}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="file" className="flex items-center gap-1 text-xs">
                        <FileText className="h-3.5 w-3.5" />
                        File
                      </TabsTrigger>
                      <TabsTrigger value="link" className="flex items-center gap-1 text-xs">
                        <Link className="h-3.5 w-3.5" />
                        Link
                      </TabsTrigger>
                      <TabsTrigger value="upload_only" className="flex items-center gap-1 text-xs">
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                      </TabsTrigger>
                      <TabsTrigger value="easyfill" className="flex items-center gap-1 text-xs">
                        <PenLine className="h-3.5 w-3.5" />
                        EasyFill
                      </TabsTrigger>
                    </TabsList>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input id="title" placeholder="Resource title..." value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" placeholder="Brief description of this resource..." value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={uploadCategory} onValueChange={setUploadCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {resourceType !== 'upload_only' && resourceType !== 'easyfill' && (
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              Mark as Required
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Staff will be required to submit as part of staff document checklist
                            </p>
                          </div>
                          <Switch checked={uploadIsImportant} onCheckedChange={setUploadIsImportant} />
                        </div>
                      )}
                      <TabsContent value="file" className="mt-0 space-y-2">
                        <Label htmlFor="file">File * (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)</Label>
                        <Input id="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                        <p className="text-xs text-muted-foreground">
                          Max file size: {MAX_FILE_SIZE_MB}MB
                          {uploadFile && (
                            <span className={uploadFile.size > MAX_FILE_SIZE_BYTES ? ' text-destructive font-medium' : ''}>
                              {' '}· Selected: {formatFileSize(uploadFile.size)}
                              {uploadFile.size > MAX_FILE_SIZE_BYTES && ' (too large)'}
                            </span>
                          )}
                        </p>
                      </TabsContent>
                      <TabsContent value="link" className="mt-0 space-y-2">
                        <Label htmlFor="link">Link URL *</Label>
                        <Input id="link" type="url" placeholder="https://..." value={uploadLinkUrl} onChange={(e) => setUploadLinkUrl(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Enter the full URL including https://</p>
                      </TabsContent>
                      <TabsContent value="upload_only" className="mt-0 space-y-2">
                        <div className="rounded-lg border border-dashed p-4 text-center">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">Upload Only Resource</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            No file to download — staff will only need to upload their completed document. This resource will automatically be marked as required.
                          </p>
                        </div>
                      </TabsContent>
                      <TabsContent value="easyfill" className="mt-0 space-y-3">
                        <div className="rounded-lg border p-4 text-center bg-muted/30">
                          <img src={easyfillLogo} alt="EasyFill.ai" className="h-10 mx-auto mb-2 object-contain" />
                          <p className="text-sm font-medium">Secure Digital Form Signing</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Embed an EasyFill.ai form that staff can fill out and sign directly within the portal.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="easyfill-url">EasyFill.ai Form URL *</Label>
                          <Input
                            id="easyfill-url"
                            type="url"
                            placeholder="https://app.easyfill.ai/pdf-form/fill/..."
                            value={easyfillUrl}
                            onChange={(e) => setEasyfillUrl(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Must be a valid EasyFill.ai URL (e.g. https://app.easyfill.ai/pdf-form/fill/...)
                          </p>
                          {easyfillUrl && !isEasyFillUrl(easyfillUrl) && (
                            <p className="text-xs text-destructive font-medium">⚠ URL must be from easyfill.ai</p>
                          )}
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={isUploading}>
                      {isUploading ? 'Saving...' : resourceType === 'file' ? 'Upload' : resourceType === 'link' ? 'Add Link' : resourceType === 'easyfill' ? 'Add Form' : 'Add Requirement'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : resources.length === 0 ? (
            <p className="text-muted-foreground text-sm">No shared resources yet.</p>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                    {resource.file_name === 'easyfill' ? (
                      <img src={easyfillLogo} alt="EasyFill.ai" className="h-5 w-5 object-contain shrink-0" />
                    ) : resource.link_url ? (
                      <Link className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {resource.is_important && (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="font-medium text-sm truncate">{resource.title}</span>
                        <Badge variant="secondary" className={getCategoryColor(resource.category)}>
                          {resource.category}
                        </Badge>
                        {resource.file_name === 'easyfill' && (
                          <Badge variant="outline" className="text-xs bg-muted">
                            <PenLine className="h-3 w-3 mr-1" />
                            EasyFill Form
                          </Badge>
                        )}
                        {resource.link_url && resource.file_name !== 'easyfill' && (
                          <Badge variant="outline" className="text-xs">Link</Badge>
                        )}
                        {resource.is_important && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {resource.link_url ? resource.link_url : resource.file_name} · {format(new Date(resource.created_at), 'MMM d, yyyy')}
                        <span className="ml-2 font-medium text-foreground">
                          · {resource.download_count} {resource.link_url ? 'click' : 'download'}{resource.download_count !== 1 ? 's' : ''}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={resource.link_url || resource.file_url} target="_blank" rel="noopener noreferrer">
                        {resource.link_url ? <ExternalLink className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(resource)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Checklist for Required Documents */}
      {showChecklist && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Required Documents Checklist
            </CardTitle>
            <CardDescription>
              Track which staff members have submitted required documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isChecklistLoading ? (
              <p className="text-muted-foreground text-sm">Loading checklist...</p>
            ) : importantResources.length === 0 ? (
              <p className="text-muted-foreground text-sm">No required documents configured.</p>
            ) : staffProfiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No approved staff members found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Staff Member</TableHead>
                      {importantResources.map(r => (
                        <TableHead key={r.id} className="min-w-[150px] text-center">
                          <div className="flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs">{r.title}</span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffProfiles.map(staff => (
                      <TableRow key={staff.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{staff.full_name}</p>
                              <p className="text-xs text-muted-foreground">{staff.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        {importantResources.map(resource => {
                          const submission = getSubmissionForStaff(staff.user_id, resource.id);
                          return (
                            <TableCell key={resource.id} className="text-center">
                              {submission ? (
                                <div className="flex flex-col items-center gap-1">
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(submission.submitted_at), 'MMM d')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <XCircle className="h-5 w-5 text-muted-foreground/40" />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => setAdminUploadDialog({ staffUserId: staff.user_id, staffName: staff.full_name, resource })}
                                  >
                                    <Upload className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Upload on Behalf of Staff Dialog */}
      <Dialog open={!!adminUploadDialog} onOpenChange={(open) => { if (!open) { setAdminUploadDialog(null); setAdminUploadFile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document for Staff</DialogTitle>
            <DialogDescription>
              Upload "{adminUploadDialog?.resource.title}" on behalf of {adminUploadDialog?.staffName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-staff-file">Select File *</Label>
              <Input
                id="admin-staff-file"
                type="file"
                onChange={(e) => setAdminUploadFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdminUploadDialog(null); setAdminUploadFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleAdminUploadForStaff} disabled={!adminUploadFile || isAdminUploading}>
              {isAdminUploading ? 'Uploading...' : 'Submit Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
