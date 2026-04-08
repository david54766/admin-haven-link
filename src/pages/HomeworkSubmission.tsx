import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Upload, FileText, CheckCircle, Clock, XCircle, AlertCircle, Download } from 'lucide-react';
import { HomeworkAssignment, HomeworkSubmission } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export default function HomeworkSubmissionPage() {
  const { trackId, homeworkId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [homework, setHomework] = useState<HomeworkAssignment | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (homeworkId && user) {
      fetchData();
    }
  }, [homeworkId, user]);

  const fetchData = async () => {
    try {
      const [homeworkRes, submissionsRes] = await Promise.all([
        supabase.from('homework_assignments').select('*').eq('id', homeworkId).single(),
        supabase
          .from('homework_submissions')
          .select('*')
          .eq('homework_id', homeworkId)
          .eq('user_id', user!.id)
          .order('submitted_at', { ascending: false }),
      ]);

      if (homeworkRes.error) throw homeworkRes.error;
      setHomework(homeworkRes.data as HomeworkAssignment);
      setSubmissions((submissionsRes.data || []) as HomeworkSubmission[]);
    } catch (error) {
      console.error('Error fetching homework:', error);
      toast({
        title: 'Error',
        description: 'Failed to load homework assignment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!user || !homework) return;
    
    // File is required only if file_required is true
    const fileIsRequired = homework.file_required !== false;
    if (fileIsRequired && !selectedFile) {
      toast({
        title: 'File Required',
        description: 'Please upload a file for this assignment.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl = '';
      let fileName = '';

      // Only upload file if one was selected
      if (selectedFile) {
        // Create unique file path
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${homework.id}/${Date.now()}.${fileExt}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('homework')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage.from('homework').getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
        fileName = selectedFile.name;
      }

      // Create submission record
      const { error: insertError } = await supabase.from('homework_submissions').insert({
        user_id: user.id,
        homework_id: homework.id,
        file_url: fileUrl,
        file_name: fileName || 'No file',
        notes: notes || null,
        reviewed_status: 'pending',
      });

      if (insertError) throw insertError;

      toast({
        title: 'Submission Successful',
        description: 'Your homework has been submitted for review.',
      });

      // Reset form and refresh
      setSelectedFile(null);
      setNotes('');
      fetchData();
    } catch (error) {
      console.error('Error submitting homework:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to submit homework. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-brand-green/20 text-brand-green">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'needs_revision':
        return (
          <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Revision
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  const latestSubmission = submissions[0];
  const isApproved = latestSubmission?.reviewed_status === 'approved';
  const canSubmit = !isApproved;
  const fileIsRequired = homework?.file_required !== false;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading homework...</p>
        </div>
      </Layout>
    );
  }

  if (!homework) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Homework assignment not found</p>
            <Button asChild className="mt-4">
              <Link to={`/training/${trackId}`}>Back to Track</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/training/${trackId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{homework.title}</h1>
              {isApproved && (
                <Badge variant="secondary" className="bg-brand-green/20 text-brand-green">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            {homework.description && (
              <p className="text-muted-foreground">{homework.description}</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        {homework.instructions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions</CardTitle>
              {homework.due_days && (
                <CardDescription>Due within {homework.due_days} days of starting</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{homework.instructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Submission Form */}
        {canSubmit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submit Your Work</CardTitle>
              <CardDescription>
                {fileIsRequired ? 'Upload your completed homework file' : 'Upload a file (optional) or share your response below'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : selectedFile
                    ? 'border-brand-green bg-brand-green/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-brand-green" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFile(null);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="font-medium">
                      Drop your file here or click to browse
                      {!fileIsRequired && <span className="text-muted-foreground font-normal"> (optional)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, Word documents, text files, and images
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Share your response:</Label>
                <Textarea
                  id="notes"
                  placeholder="Share your thoughts, reflections, or any additional context about your work..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSubmit}
                disabled={(fileIsRequired && !selectedFile) || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Homework
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Previous Submissions */}
        {submissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Submissions</CardTitle>
              <CardDescription>
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submissions.map((submission, index) => (
                <div key={submission.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{submission.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Submitted {new Date(submission.submitted_at).toLocaleDateString()} at{' '}
                            {new Date(submission.submitted_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      {submission.notes && (
                        <p className="text-sm text-muted-foreground ml-8">{submission.notes}</p>
                      )}
                      {submission.review_notes && (
                        <div className="ml-8 p-3 rounded-lg bg-muted">
                          <p className="text-sm font-medium">Reviewer Feedback:</p>
                          <p className="text-sm">{submission.review_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(submission.reviewed_status)}
                      <Button variant="outline" size="sm" asChild>
                        <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-3 w-3" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link to={`/training/${trackId}`}>Back to Track</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}