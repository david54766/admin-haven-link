import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Trash2, Download, Plus, Calendar, FolderOpen, Settings, X } from 'lucide-react';
import { StaffDocument, DocumentType } from '@/types/database';
import { format } from 'date-fns';
import { SharedResourcesList } from '@/components/documents/SharedResourcesList';

export default function Documents() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'expiration'>('date');
  const [filterType, setFilterType] = useState<string>('all');

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTypeId, setUploadTypeId] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadExpiresAt, setUploadExpiresAt] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [isManagingTypes, setIsManagingTypes] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchDocumentTypes();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_documents')
        .select('*, document_type:document_types(*)')
        .eq('user_id', user!.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as StaffDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setDocumentTypes((data || []) as DocumentType[]);
    } catch (error) {
      console.error('Error fetching document types:', error);
    }
  };

  const handleAddDocumentType = async () => {
    if (!newTypeName.trim()) return;
    try {
      const { error } = await supabase.from('document_types').insert({ name: newTypeName.trim() });
      if (error) throw error;
      toast({ title: 'Document Type Added', description: `"${newTypeName.trim()}" has been added.` });
      setNewTypeName('');
      fetchDocumentTypes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteDocumentType = async (typeId: string, typeName: string) => {
    if (!confirm(`Delete document type "${typeName}"? Documents using this type will become uncategorized.`)) return;
    try {
      const { error } = await supabase.from('document_types').delete().eq('id', typeId);
      if (error) throw error;
      toast({ title: 'Document Type Deleted', description: `"${typeName}" has been removed.` });
      if (uploadTypeId === typeId) setUploadTypeId('');
      fetchDocumentTypes();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and select a file.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const { error: insertError } = await supabase.from('staff_documents').insert({
        user_id: user!.id,
        title: uploadTitle,
        file_url: urlData.publicUrl,
        file_name: uploadFile.name,
        document_type_id: uploadTypeId || null,
        tags: uploadTags ? uploadTags.split(',').map((t) => t.trim()) : null,
        expires_at: uploadExpiresAt || null,
      });

      if (insertError) throw insertError;

      toast({
        title: 'Document Uploaded',
        description: 'Your document has been uploaded successfully.',
      });

      // Reset form and refresh
      setUploadFile(null);
      setUploadTitle('');
      setUploadTypeId('');
      setUploadTags('');
      setUploadExpiresAt('');
      setIsDialogOpen(false);
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'There was an error uploading your document.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: StaffDocument) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Delete from storage (extract path from URL)
      const urlParts = doc.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      await supabase.storage.from('documents').remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from('staff_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast({
        title: 'Document Deleted',
        description: 'Your document has been deleted.',
      });

      fetchDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'There was an error deleting your document.',
        variant: 'destructive',
      });
    }
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    }
    if (sortBy === 'type') {
      return (a.document_type?.name || 'Z').localeCompare(b.document_type?.name || 'Z');
    }
    if (sortBy === 'expiration') {
      if (!a.expires_at) return 1;
      if (!b.expires_at) return -1;
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    }
    return 0;
  });

  const filteredDocuments = sortedDocuments.filter((doc) => {
    if (filterType === 'all') return true;
    return doc.document_type_id === filterType;
  });

  const isExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(expiresAt) <= thirtyDaysFromNow;
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50">
                <FileText className="h-3 w-3 text-brand-purple" />
                <span className="text-xs font-medium text-foreground">Document Center</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">My Documents</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage your credentials, certifications, and other documents.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2">
              <DialogHeader>
                <DialogTitle className="text-xl">Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document to your profile.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Document title"
                    className="border-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="type">Document Type</Label>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground"
                        onClick={() => setIsManagingTypes(!isManagingTypes)}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        {isManagingTypes ? 'Done' : 'Manage'}
                      </Button>
                    )}
                  </div>
                  {isManagingTypes && isAdmin ? (
                    <div className="space-y-2 mt-1">
                      <div className="flex gap-2">
                        <Input
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          placeholder="New type name"
                          className="border-2 focus-visible:ring-primary text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddDocumentType()}
                        />
                        <Button size="sm" onClick={handleAddDocumentType} disabled={!newTypeName.trim()}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 border-2 rounded-md p-2">
                        {documentTypes.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">No types yet</p>
                        ) : (
                          documentTypes.map((type) => (
                            <div key={type.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-accent/30">
                              <span className="text-sm">{type.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteDocumentType(type.id, type.name)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <Select value={uploadTypeId} onValueChange={setUploadTypeId}>
                      <SelectTrigger className="border-2">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label htmlFor="file">File *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="border-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="training, certification, 2024"
                    className="border-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <Label htmlFor="expires">Expiration Date</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={uploadExpiresAt}
                    onChange={(e) => setUploadExpiresAt(e.target.value)}
                    className="border-2 focus-visible:ring-primary"
                  />
                </div>
                <Button onClick={handleUpload} disabled={isUploading} className="w-full bg-primary hover:bg-primary/90">
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Required Documents Checklist */}
        <SharedResourcesList section="required" />

        {/* Filters */}
        <Card className="border-2">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Sort by:</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[150px] border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Upload Date</SelectItem>
                  <SelectItem value="type">Document Type</SelectItem>
                  <SelectItem value="expiration">Expiration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Filter by type:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px] border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-purple/10">
                <FolderOpen className="h-5 w-5 text-brand-purple" />
              </div>
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  {filteredDocuments.length} document(s) found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading documents...</p>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-brand-yellow/20 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-brand-yellow" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
                <p className="text-muted-foreground">Upload your first document to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-accent/30">
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-2">
                          {doc.document_type?.name || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {doc.tags?.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs bg-brand-cyan/10 text-brand-cyan border-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {doc.expires_at ? (
                          <span className={isExpiringSoon(doc.expires_at) ? 'text-destructive font-medium' : ''}>
                            {format(new Date(doc.expires_at), 'MMM d, yyyy')}
                            {isExpiringSoon(doc.expires_at) && ' ⚠️'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:bg-brand-cyan/10 hover:text-brand-cyan"
                            asChild
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Shared Resources from Admin */}
        <SharedResourcesList section="shared" />
      </div>
    </Layout>
  );
}
