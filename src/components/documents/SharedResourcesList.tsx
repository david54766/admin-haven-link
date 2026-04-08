import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText, FolderDown, Link, ExternalLink, AlertTriangle, CheckCircle, Upload, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { isEasyFillUrl } from '@/components/documents/EasyFillViewer';
import easyfillLogo from '@/assets/easyfill-logo.png';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface ImportantSubmission {
  id: string;
  resource_id: string;
  submitted_at: string;
  file_name: string;
}

export function SharedResourcesList({ section }: { section?: 'required' | 'shared' }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mySubmissions, setMySubmissions] = useState<ImportantSubmission[]>([]);

  // Upload dialog state
  const [uploadDialogResource, setUploadDialogResource] = useState<SharedResource | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);


  useEffect(() => {
    fetchResources();
    if (user) fetchMySubmissions();
  }, [user]);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('shared_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching shared resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMySubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('important_document_submissions')
        .select('id, resource_id, submitted_at, file_name')
        .eq('user_id', user!.id);

      if (error) throw error;
      setMySubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const categories = ['all', ...new Set(resources.map((r) => r.category))];

  const filteredResources = resources.filter((r) =>
    selectedCategory === 'all' || r.category === selectedCategory
  );

  // Sort important documents first
  const sortedResources = [...filteredResources].sort((a, b) => {
    if (a.is_important && !b.is_important) return -1;
    if (!a.is_important && b.is_important) return 1;
    return 0;
  });

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'forms': return 'bg-brand-purple/10 text-brand-purple border-brand-purple/30';
      case 'policies': return 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30';
      case 'templates': return 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30';
      case 'training': return 'bg-brand-pink/10 text-brand-pink border-brand-pink/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleAccess = async (resource: SharedResource) => {
    try {
      await supabase.rpc('increment_download_count', { resource_id: resource.id });
      setResources((prev) =>
        prev.map((r) =>
          r.id === resource.id ? { ...r, download_count: r.download_count + 1 } : r
        )
      );
    } catch (error) {
      console.error('Error tracking access:', error);
    }

    if (resource.link_url) {
      window.open(resource.link_url, '_blank');
    } else if (resource.file_url) {
      try {
        const url = new URL(resource.file_url);
        const pathMatch = url.pathname.match(/\/object\/public\/shared-resources\/(.+)/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          const { data, error } = await supabase.storage
            .from('shared-resources')
            .download(filePath);
          if (data && !error) {
            const blobUrl = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = resource.file_name || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            return;
          }
        }
        window.open(resource.file_url, '_blank');
      } catch {
        window.open(resource.file_url, '_blank');
      }
    }
  };

  const getSubmission = (resourceId: string) => {
    return mySubmissions.find(s => s.resource_id === resourceId);
  };

  const handleSubmitImportantDoc = async () => {
    if (!uploadFile || !uploadDialogResource || !user) return;

    setIsUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const filePath = `${user.id}/important/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('important_document_submissions')
        .insert({
          user_id: user.id,
          resource_id: uploadDialogResource.id,
          file_url: urlData.publicUrl,
          file_name: uploadFile.name,
        });

      if (insertError) throw insertError;

      toast({ title: 'Document Submitted', description: 'Your document has been submitted successfully.' });
      setUploadDialogResource(null);
      setUploadFile(null);
      fetchMySubmissions();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({ title: 'Submit Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const importantResources = resources.filter(r => r.is_important);
  const submittedCount = importantResources.filter(r => getSubmission(r.id)).length;

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">Loading resources...</p>
        </CardContent>
      </Card>
    );
  }

  if (resources.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-cyan/10">
              <FolderDown className="h-5 w-5 text-brand-cyan" />
            </div>
            <div>
              <CardTitle>Shared Resources</CardTitle>
              <CardDescription>Documents uploaded by admin for staff</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No shared resources available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const requiredSection = importantResources.length > 0 ? (
    <>
      <Card className="border-2 border-amber-200 bg-amber-50/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Required Documents Checklist</CardTitle>
              <CardDescription>
                {submittedCount} of {importantResources.length} required documents submitted
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {importantResources.map((resource) => {
              const submission = getSubmission(resource.id);
              return (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-background"
                >
                  <div className="flex items-center gap-3">
                    {submission ? (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{resource.title}</p>
                      {submission ? (
                        <p className="text-xs text-green-600">
                          Submitted: {submission.file_name} · {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not yet submitted</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(resource.file_url || resource.link_url) && (
                      <Button variant="outline" size="sm" onClick={() => handleAccess(resource)}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                    {!submission && (
                      <Button size="sm" onClick={() => setUploadDialogResource(resource)}>
                        <Upload className="h-4 w-4 mr-1" />
                        Submit
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Important Document Dialog */}
      <Dialog open={!!uploadDialogResource} onOpenChange={(open) => { if (!open) { setUploadDialogResource(null); setUploadFile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Required Document</DialogTitle>
            <DialogDescription>
              Upload your copy of "{uploadDialogResource?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="important-file">Select File *</Label>
              <Input
                id="important-file"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogResource(null); setUploadFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmitImportantDoc} disabled={!uploadFile || isUploading}>
              {isUploading ? 'Submitting...' : 'Submit Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  ) : null;

  const sharedSection = (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-cyan/10">
              <FolderDown className="h-5 w-5 text-brand-cyan" />
            </div>
            <div>
              <CardTitle>Shared Resources</CardTitle>
              <CardDescription>
                {filteredResources.length} document(s) available for download
              </CardDescription>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-4">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {sortedResources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-muted">
                  {resource.file_name === 'easyfill' ? (
                    <img src={easyfillLogo} alt="EasyFill.ai" className="h-5 w-5 object-contain" />
                  ) : resource.link_url ? (
                    <Link className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {resource.is_important && (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <h4 className="font-medium truncate">{resource.title}</h4>
                    <Badge variant="outline" className={getCategoryColor(resource.category)}>
                      {resource.category}
                    </Badge>
                    {resource.link_url && resource.file_name !== 'easyfill' && (
                      <Badge variant="outline" className="text-xs">Link</Badge>
                    )}
                    {resource.file_name === 'easyfill' && (
                      <Badge variant="outline" className="text-xs bg-muted">
                        <PenLine className="h-3 w-3 mr-1" />
                        EasyFill Form
                      </Badge>
                    )}
                  </div>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {resource.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Added {format(new Date(resource.created_at), 'MMM d, yyyy')} · {resource.link_url ? 'External link' : resource.file_name}
                    {resource.download_count > 0 && (
                      <span className="ml-2">· {resource.download_count} {resource.link_url ? 'click' : 'download'}{resource.download_count !== 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {resource.file_name === 'easyfill' && resource.link_url ? (
                  <Button size="sm" asChild>
                    <a href={resource.link_url!} target="_blank" rel="noopener noreferrer">
                      <PenLine className="h-4 w-4 mr-2" />
                      Open & Sign
                    </a>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAccess(resource)}
                    >
                      {resource.link_url ? (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                    {resource.link_url && !getSubmission(resource.id) && (
                      <Button
                        size="sm"
                        onClick={() => setUploadDialogResource(resource)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Completed Document
                      </Button>
                    )}
                    {resource.link_url && getSubmission(resource.id) && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Submitted
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );


  if (section === 'required') return <>{requiredSection}</>;
  if (section === 'shared') return <>{sharedSection}</>;

  return (
    <>
      {requiredSection}
      {sharedSection}
    </>
  );
}
