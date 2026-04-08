import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, ClipboardList, Eye, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';

interface ChecklistTemplate {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  template_id: string;
  label: string;
  order_index: number;
  section: string | null;
}

interface SubmissionView {
  id: string;
  template_id: string;
  user_id: string;
  submission_date: string;
  notes: string | null;
  submitted_at: string;
  profile?: { full_name: string; email: string };
  template?: { title: string };
  items: {
    item_id: string;
    is_checked: boolean;
    notes: string | null;
    label: string;
  }[];
}

export default function AdminChecklists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Template form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<{ label: string; order_index: number; section: string | null }[]>([]);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemSection, setNewItemSection] = useState('');

  // Submissions filters
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState('all');
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionView | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch templates with items
      const { data: templatesData } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('created_at', { ascending: false });

      const templatesWithItems: ChecklistTemplate[] = [];
      for (const t of templatesData || []) {
        const { data: itemsData } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('template_id', t.id)
          .order('order_index');
        templatesWithItems.push({ ...t, items: (itemsData || []) as ChecklistItem[] });
      }
      setTemplates(templatesWithItems);

      // Fetch submissions
      await fetchSubmissions();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data: subs } = await supabase
        .from('checklist_submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(200);

      if (!subs) return;

      // Fetch profiles and templates for display
      const userIds = [...new Set(subs.map(s => s.user_id))];
      const templateIds = [...new Set(subs.map(s => s.template_id))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds.length > 0 ? userIds : ['none']);

      const { data: temps } = await supabase
        .from('checklist_templates')
        .select('id, title')
        .in('id', templateIds.length > 0 ? templateIds : ['none']);

      // Fetch all submission items
      const subIds = subs.map(s => s.id);
      const { data: subItems } = await supabase
        .from('checklist_submission_items')
        .select('*')
        .in('submission_id', subIds.length > 0 ? subIds : ['none']);

      // Fetch all checklist items for labels
      const { data: allItems } = await supabase
        .from('checklist_items')
        .select('id, label')
        .in('template_id', templateIds.length > 0 ? templateIds : ['none']);

      const itemLabels = new Map((allItems || []).map(i => [i.id, i.label]));

      const enriched: SubmissionView[] = subs.map(s => ({
        ...s,
        profile: profiles?.find(p => p.user_id === s.user_id) as any,
        template: temps?.find(t => t.id === s.template_id) as any,
        items: (subItems || [])
          .filter(si => si.submission_id === s.id)
          .map(si => ({
            item_id: si.item_id,
            is_checked: si.is_checked,
            notes: si.notes,
            label: itemLabels.get(si.item_id) || 'Unknown item',
          })),
      }));

      setSubmissions(enriched);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Please add at least one checklist item', variant: 'destructive' });
      return;
    }

    try {
      if (editingTemplate) {
        // Update template
        const { error } = await supabase
          .from('checklist_templates')
          .update({ title, description: description || null })
          .eq('id', editingTemplate.id);
        if (error) throw error;

        // Delete old items and re-insert
        await supabase.from('checklist_items').delete().eq('template_id', editingTemplate.id);
        const { error: itemsError } = await supabase.from('checklist_items').insert(
          items.map((item, idx) => ({
            template_id: editingTemplate.id,
            label: item.label,
            order_index: idx,
            section: item.section || null,
          }))
        );
        if (itemsError) throw itemsError;

        toast({ title: 'Template updated!' });
      } else {
        // Create template
        const { data: newTemplate, error } = await supabase
          .from('checklist_templates')
          .insert({ title, description: description || null, created_by: user!.id })
          .select()
          .single();
        if (error) throw error;

        // Insert items
        const { error: itemsError } = await supabase.from('checklist_items').insert(
          items.map((item, idx) => ({
            template_id: newTemplate.id,
            label: item.label,
            order_index: idx,
            section: item.section || null,
          }))
        );
        if (itemsError) throw itemsError;

        toast({ title: 'Template created!' });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error saving template', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template? All associated submissions will also be deleted.')) return;
    try {
      const { error } = await supabase.from('checklist_templates').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Template deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('checklist_templates')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: isActive } : t));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const addItem = () => {
    if (!newItemLabel.trim()) return;
    setItems(prev => [...prev, { label: newItemLabel.trim(), order_index: prev.length, section: newItemSection.trim() || null }]);
    setNewItemLabel('');
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setItems([]);
    setNewItemLabel('');
    setNewItemSection('');
    setEditingTemplate(null);
    setDialogOpen(false);
  };

  const openEdit = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    setTitle(template.title);
    setDescription(template.description || '');
    setItems(template.items.map(i => ({ label: i.label, order_index: i.order_index, section: i.section })));
    setDialogOpen(true);
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesDate = !dateFilter || s.submission_date === dateFilter;
    const matchesSearch = !searchQuery.trim() ||
      s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTemplate = selectedTemplateFilter === 'all' || s.template_id === selectedTemplateFilter;
    return matchesDate && matchesSearch && matchesTemplate;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Checklists</h1>
          <p className="text-muted-foreground">Manage checklist templates and view staff submissions.</p>
        </div>

        <Tabs defaultValue="templates">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="templates" className="text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="submissions" className="text-xs sm:text-sm">
              <Eye className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Checklist Templates</CardTitle>
                  <CardDescription>Create checklists that staff will complete daily.</CardDescription>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="mr-2 h-4 w-4" />New Template</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                      <DialogDescription>Define a checklist with items staff will check off daily.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Title *</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., End of Day Checklist" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." />
                      </div>
                      <div>
                        <Label>Checklist Items</Label>
                        <div className="space-y-2 mt-2">
                          {(() => {
                            const grouped: { section: string | null; items: { item: typeof items[0]; idx: number }[] }[] = [];
                            items.forEach((item, idx) => {
                              const last = grouped[grouped.length - 1];
                              if (last && last.section === item.section) {
                                last.items.push({ item, idx });
                              } else {
                                grouped.push({ section: item.section, items: [{ item, idx }] });
                              }
                            });
                            return grouped.map((group, gi) => (
                              <div key={gi} className="space-y-1">
                                {group.section && (
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">{group.section}</p>
                                )}
                                {group.items.map(({ item, idx }) => (
                                  <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                                    <div className="flex flex-col shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        disabled={idx === 0}
                                        onClick={() => {
                                          const newItems = [...items];
                                          [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
                                          setItems(newItems);
                                        }}
                                      >
                                        <ArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        disabled={idx === items.length - 1}
                                        onClick={() => {
                                          const newItems = [...items];
                                          [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
                                          setItems(newItems);
                                        }}
                                      >
                                        <ArrowDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <span className="flex-1 text-sm">{item.label}</span>
                                    <Badge variant="outline" className="text-[10px] shrink-0">{item.section || 'No section'}</Badge>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ));
                          })()}
                          <div className="space-y-2 pt-2 border-t">
                            <Input
                              value={newItemSection}
                              onChange={e => setNewItemSection(e.target.value)}
                              placeholder="Section name (e.g., 🧼 Cleaning & Sanitizing)"
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Input
                                value={newItemLabel}
                                onChange={e => setNewItemLabel(e.target.value)}
                                placeholder="Add checklist item..."
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())}
                              />
                              <Button variant="outline" size="sm" onClick={addItem}>Add</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Items will be grouped under the current section name. Change the section name before adding items to start a new group.</p>
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleSaveTemplate} className="w-full">
                        {editingTemplate ? 'Update Template' : 'Create Template'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : templates.length === 0 ? (
                  <p className="text-muted-foreground">No templates yet. Create one to get started.</p>
                ) : (
                  <div className="space-y-4">
                    {templates.map(template => (
                      <Card key={template.id} className="border">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-lg">{template.title}</CardTitle>
                                <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                  {template.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              {template.description && (
                                <CardDescription className="mt-1">{template.description}</CardDescription>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Switch
                                checked={template.is_active}
                                onCheckedChange={(checked) => handleToggleActive(template.id, checked)}
                              />
                              <Button variant="outline" size="sm" onClick={() => openEdit(template)}>Edit</Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTemplate(template.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground mb-2">{template.items.length} items:</p>
                          {(() => {
                            const sections: { section: string | null; items: ChecklistItem[] }[] = [];
                            template.items.forEach(item => {
                              const last = sections[sections.length - 1];
                              if (last && last.section === item.section) {
                                last.items.push(item);
                              } else {
                                sections.push({ section: item.section, items: [item] });
                              }
                            });
                            return (
                              <div className="space-y-3">
                                {sections.map((group, gi) => (
                                  <div key={gi}>
                                    {group.section && (
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{group.section}</p>
                                    )}
                                    <ul className="space-y-1 ml-1">
                                      {group.items.map(item => (
                                        <li key={item.id} className="text-sm flex items-center gap-2">
                                          <div className="h-3.5 w-3.5 rounded-sm border border-muted-foreground/30 shrink-0" />
                                          {item.label}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>Staff Submissions</CardTitle>
                <CardDescription>View daily checklist submissions from staff.</CardDescription>
                <div className="flex flex-wrap gap-3 pt-4">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="w-[180px]"
                  />
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 w-[200px]"
                    />
                  </div>
                  <Select value={selectedTemplateFilter} onValueChange={setSelectedTemplateFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Templates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredSubmissions.length === 0 ? (
                  <p className="text-muted-foreground">No submissions found for the selected filters.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Checklist</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Completed</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map(sub => {
                        const checkedCount = sub.items.filter(i => i.is_checked).length;
                        const totalCount = sub.items.length;
                        return (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.profile?.full_name || 'Unknown'}</TableCell>
                            <TableCell>{sub.template?.title || 'Unknown'}</TableCell>
                            <TableCell>{format(new Date(sub.submission_date + 'T00:00:00'), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={checkedCount === totalCount ? 'default' : 'secondary'}>
                                {checkedCount}/{totalCount}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(sub.submitted_at), 'h:mm a')}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => setViewingSubmission(sub)}>
                                <Eye className="h-3.5 w-3.5 mr-1" />View
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

        {/* Submission Detail Dialog */}
        <Dialog open={!!viewingSubmission} onOpenChange={(open) => !open && setViewingSubmission(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Checklist Submission</DialogTitle>
              <DialogDescription>
                {viewingSubmission?.profile?.full_name} — {viewingSubmission?.template?.title}
                <br />
                {viewingSubmission && format(new Date(viewingSubmission.submission_date + 'T00:00:00'), 'MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {viewingSubmission?.items.map((item, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${item.is_checked ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                  <div className={`mt-0.5 h-5 w-5 rounded-sm border-2 flex items-center justify-center shrink-0 ${item.is_checked ? 'bg-green-500 border-green-500 text-white' : 'border-red-300'}`}>
                    {item.is_checked && '✓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                  </div>
                </div>
              ))}
              {viewingSubmission?.notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Additional Notes</p>
                  <p className="text-sm">{viewingSubmission.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
