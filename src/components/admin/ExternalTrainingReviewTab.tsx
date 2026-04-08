import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, ExternalLink, CheckCheck, XCircle, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Submission {
  id: string;
  external_training_id: string;
  user_id: string;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  submitted_at: string;
  external_training?: {
    title: string;
    module?: { title: string } | null;
  };
  profile?: {
    full_name: string;
    email: string;
  };
}

export function ExternalTrainingReviewTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'submitted' | 'approved' | 'rejected' | 'all'>('submitted');
  const [search, setSearch] = useState('');
  const [reviewDialog, setReviewDialog] = useState<Submission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('external_training_submissions')
        .select('*, external_training:module_external_trainings(title, module:modules(title))')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
      let profileMap: Record<string, { full_name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        (profiles || []).forEach((p: any) => {
          profileMap[p.user_id] = { full_name: p.full_name, email: p.email };
        });
      }

      setSubmissions(
        (data || []).map((d: any) => ({
          ...d,
          profile: profileMap[d.user_id] || { full_name: 'Unknown', email: '' },
        }))
      );
    } catch (error) {
      console.error('Error fetching external training submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = submissions.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const matchesSearch = !search ||
      s.profile?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.profile?.email.toLowerCase().includes(search.toLowerCase()) ||
      s.external_training?.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = submissions.filter(s => s.status === 'submitted').length;

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!reviewDialog || !user) return;
    setIsReviewing(true);
    try {
      const { error } = await supabase
        .from('external_training_submissions')
        .update({
          status,
          review_notes: reviewNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewDialog.id);

      if (error) throw error;
      toast({ title: `Submission ${status === 'approved' ? 'Approved' : 'Rejected'}` });
      setReviewDialog(null);
      setReviewNotes('');
      fetchSubmissions();
    } catch (error: any) {
      toast({ title: 'Review Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-primary/10 text-primary border-primary/20">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-2xl text-destructive">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-2xl text-primary">{submissions.filter(s => s.status === 'approved').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-2xl">{submissions.filter(s => s.status === 'rejected').length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card className="border-2">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by staff or training..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-2" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Status:</Label>
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="w-[150px] border-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="submitted">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>External Training Submissions</CardTitle>
            <CardDescription>{filtered.length} submission(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading submissions...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ExternalLink className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Submissions Found</h3>
                <p className="text-muted-foreground">
                  {filter === 'submitted' ? 'No certificates awaiting review.' : 'No submissions match your filters.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Training</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{s.profile?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.external_training?.title || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.external_training?.module?.title || '—'}</TableCell>
                      <TableCell className="text-sm">{format(new Date(s.submitted_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(s.status)}</TableCell>
                      <TableCell>
                        {s.file_url ? (
                          <a href={s.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                            {s.file_name || 'View'}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Self-confirmed</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {s.status === 'submitted' ? (
                            <Button size="sm" onClick={() => { setReviewDialog(s); setReviewNotes(''); }}>
                              Review
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => { setReviewDialog(s); setReviewNotes(s.review_notes || ''); }}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) { setReviewDialog(null); setReviewNotes(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review External Training Submission</DialogTitle>
            <DialogDescription>
              {reviewDialog?.external_training?.title} — {reviewDialog?.profile?.full_name}
            </DialogDescription>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground text-xs">Staff Member</Label>
                  <p className="text-sm font-medium">{reviewDialog.profile?.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Submitted</Label>
                  <p className="text-sm">{format(new Date(reviewDialog.submitted_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Module</Label>
                  <p className="text-sm">{reviewDialog.external_training?.module?.title || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Current Status</Label>
                  <div className="mt-0.5">{getStatusBadge(reviewDialog.status)}</div>
                </div>
              </div>

              {reviewDialog.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Staff Notes</Label>
                  <p className="text-sm bg-muted/50 p-3 rounded-md mt-1">{reviewDialog.notes}</p>
                </div>
              )}

              {reviewDialog.file_url ? (
                <Button variant="outline" className="w-full" asChild>
                  <a href={reviewDialog.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download: {reviewDialog.file_name || 'Certificate'}
                  </a>
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md text-center">
                  No certificate uploaded — self-confirmed completion
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes (optional)</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add feedback for the staff member..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="border-2"
                  rows={3}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {reviewDialog.status === 'submitted' ? (
                  <>
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleReview('rejected')} disabled={isReviewing}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button onClick={() => handleReview('approved')} disabled={isReviewing}>
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => handleReview(reviewDialog.status as any)} disabled={isReviewing}>
                    Update Notes
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
