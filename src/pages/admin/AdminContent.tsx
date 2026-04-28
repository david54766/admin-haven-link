import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CertificateTemplateEditor } from '@/components/admin/CertificateTemplateEditor';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useContentDefaults } from '@/hooks/useContentDefaults';
import { Plus, Edit, Trash2, GripVertical, BookOpen, PlayCircle, FileQuestion, FileText, HelpCircle, ClipboardCheck, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrainingTrack, Module, Video, Quiz, HomeworkAssignment, ModulePresentation, ModuleDocument } from '@/types/database';
import { VideoUploader } from '@/components/admin/VideoUploader';
import { FileUploader } from '@/components/admin/FileUploader';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTrackCard } from '@/components/admin/SortableTrackCard';
import { HomeworkReviewTab } from '@/components/admin/HomeworkReviewTab';
import { ExternalTrainingReviewTab } from '@/components/admin/ExternalTrainingReviewTab';
import { TrackPositionAssigner } from '@/components/admin/TrackPositionAssigner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminContent() {
  const { toast } = useToast();
  const { actingTenantId, profile } = useAuth();
  const { getEffectiveDefaults } = useContentDefaults();
  const effectiveTenantId = actingTenantId || profile?.tenant_id || null;
  const [tracks, setTracks] = useState<TrainingTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'track' | 'module' | 'video' | 'quiz' | 'homework' | 'presentation' | 'document' | 'external_training' | 'lesson'>('track');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [formCertificateTemplateId, setFormCertificateTemplateId] = useState<string | null>(null);
  const [formCertificateTitle, setFormCertificateTitle] = useState('');
  const [formCourseHours, setFormCourseHours] = useState<number | null>(null);
  const [formCertificateExpiryDays, setFormCertificateExpiryDays] = useState<number | null>(null);
  const [formCertificateMode, setFormCertificateMode] = useState<'per_track' | 'per_module'>('per_track');
  const [formCertTextFields, setFormCertTextFields] = useState<any[]>([]);
  const [formCertBgUrl, setFormCertBgUrl] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAutoAssign, setFormAutoAssign] = useState(false);
  const [formCertificateEnabled, setFormCertificateEnabled] = useState(false);
  const [formIsPriority, setFormIsPriority] = useState(false);
  const [formInstructorName, setFormInstructorName] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formPassingScore, setFormPassingScore] = useState(70);
  const [formMaxAttempts, setFormMaxAttempts] = useState<number | null>(null);
  const [formInstructions, setFormInstructions] = useState('');
  const [formDueDays, setFormDueDays] = useState<number | null>(null);
  const [formIsRequired, setFormIsRequired] = useState(true);
  const [formFileRequired, setFormFileRequired] = useState(true);
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formAllowMarkComplete, setFormAllowMarkComplete] = useState(false);
  const [formAllowDownload, setFormAllowDownload] = useState(false);
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formRequiresCertificate, setFormRequiresCertificate] = useState(true);
  
  // Track-level default overrides (null = inherit from system)
  const [formDefaultAllowMarkComplete, setFormDefaultAllowMarkComplete] = useState<boolean | null>(null);
  const [formDefaultAllowDownload, setFormDefaultAllowDownload] = useState<boolean | null>(null);

  useEffect(() => {
    fetchTracks();
  }, [effectiveTenantId]);

  const fetchTracks = async () => {
    if (!effectiveTenantId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('training_tracks')
        .select(`
          *,
          modules(
            *,
            videos(*),
            quizzes(*, quiz_questions(*)),
            homework_assignments(*),
            module_presentations(*),
            module_documents(*),
            module_external_trainings(*),
            module_lessons(*, lesson_pages(*))
          )
        `)
        .eq('tenant_id', effectiveTenantId)
        .order('order_index');

      if (error) throw error;
      setTracks(((data || []) as TrainingTrack[]).filter(track => track.tenant_id === effectiveTenantId));
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (type: typeof dialogType, item?: any, parent?: string) => {
    setDialogType(type);
    setEditingItem(item || null);
    setParentId(parent || null);

    if (item) {
      setFormTitle(item.title || '');
      setFormDescription(item.description || '');
      setFormIsActive(item.is_active ?? true);
      setFormAutoAssign(item.auto_assign ?? false);
      setFormCertificateEnabled(item.certificate_enabled ?? false);
      setFormIsPriority(item.is_priority ?? false);
      setFormInstructorName(item.instructor_name || '');
      setFormVideoUrl(item.video_url || '');
      setFormPassingScore(item.passing_score || 70);
      setFormMaxAttempts(item.max_attempts || null);
      setFormInstructions(item.instructions || '');
      setFormDueDays(item.due_days || null);
      setFormIsRequired(item.is_required ?? true);
      setFormFileRequired(item.file_required ?? true);
      setFormFileUrl(item.file_url || '');
      setFormFileName(item.file_name || '');
      setFormAllowMarkComplete(item.allow_mark_complete ?? true);
      setFormAllowDownload(item.allow_download ?? true);
      setFormExternalUrl(item.external_url || '');
      setFormRequiresCertificate(item.requires_certificate ?? true);
      setFormCertificateTemplateId(item.certificate_template_id ?? null);
      setFormCertificateTitle(item.certificate_title || '');
      setFormCourseHours(item.course_hours ?? null);
      setFormCertificateExpiryDays(item.certificate_expiry_days ?? null);
      setFormCertificateMode(item.certificate_mode || 'per_track');
      setFormCertTextFields([]);
      setFormCertBgUrl(null);
      // Track-level defaults
      setFormDefaultAllowMarkComplete(item.default_allow_mark_complete ?? null);
      setFormDefaultAllowDownload(item.default_allow_download ?? null);
    } else {
      resetForm();
      
      // For content types (video, presentation, document), apply effective defaults
      if (type === 'video' || type === 'presentation' || type === 'document') {
        // Find the track that contains this module to get its defaults
        const moduleId = parent;
        let trackDefaults: { default_allow_mark_complete: boolean | null; default_allow_download: boolean | null } | null = null;
        
        for (const track of tracks) {
          const modules = track.modules || [];
          if (modules.some((m: Module) => m.id === moduleId)) {
            trackDefaults = {
              default_allow_mark_complete: (track as any).default_allow_mark_complete ?? null,
              default_allow_download: (track as any).default_allow_download ?? null,
            };
            break;
          }
        }
        
        const effectiveDefaults = getEffectiveDefaults(trackDefaults);
        setFormAllowMarkComplete(effectiveDefaults.allow_mark_complete);
        setFormAllowDownload(effectiveDefaults.allow_download);
      }
    }

    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormIsActive(true);
    setFormAutoAssign(false);
    setFormCertificateEnabled(false);
    setFormIsPriority(false);
    setFormInstructorName('');
    setFormVideoUrl('');
    setFormPassingScore(70);
    setFormMaxAttempts(null);
    setFormInstructions('');
    setFormDueDays(null);
    setFormIsRequired(true);
    setFormFileRequired(true);
    setFormFileUrl('');
    setFormFileName('');
    setFormAllowMarkComplete(false);
    setFormAllowDownload(false);
    setFormDefaultAllowMarkComplete(null);
    setFormDefaultAllowDownload(null);
    setFormExternalUrl('');
    setFormRequiresCertificate(true);
    setFormCertificateTemplateId(null);
    setFormCertificateTitle('');
    setFormCourseHours(null);
    setFormCertificateExpiryDays(null);
    setFormCertificateMode('per_track');
    setFormCertTextFields([]);
    setFormCertBgUrl(null);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ title: 'Title Required', variant: 'destructive' });
      return;
    }

    try {
      const data: any = { title: formTitle, description: formDescription };

      if (dialogType === 'track') {
        data.is_active = formIsActive;
        data.auto_assign = formAutoAssign;
        data.is_priority = formIsPriority;
        data.certificate_enabled = formCertificateEnabled;
        data.instructor_name = formInstructorName || null;
        data.certificate_template_id = formCertificateTemplateId;
        data.certificate_title = formCertificateTitle || null;
        data.course_hours = formCourseHours;
        data.certificate_expiry_days = formCertificateExpiryDays;
        data.certificate_mode = formCertificateMode;
        data.default_allow_mark_complete = formDefaultAllowMarkComplete;
        data.default_allow_download = formDefaultAllowDownload;
        if (editingItem) {
          const { error } = await supabase.from('training_tracks').update(data).eq('id', editingItem.id);
          if (error) throw error;
          
          // Retroactively issue certificates if certificate_enabled was just turned on
          const wasCertEnabled = editingItem.certificate_enabled ?? false;
          if (formCertificateEnabled && !wasCertEnabled && formInstructorName) {
            try {
              const { data: result, error: retroError } = await supabase.functions.invoke(
                'issue-retroactive-certificates',
                { body: { track_id: editingItem.id } }
              );
              if (!retroError && result?.issued > 0) {
                toast({ title: `${result.issued} retroactive certificate(s) issued for users who already completed this track.` });
              }
            } catch (e) {
              console.error('Retroactive certificate issuance error:', e);
            }
          }
        } else {
          // Get min order_index to place new track at top
          const { data: minData } = await supabase
            .from('training_tracks')
            .select('order_index')
            .order('order_index', { ascending: true })
            .limit(1)
            .single();
          data.order_index = (minData?.order_index ?? 0) - 1;
          const { error } = await supabase.from('training_tracks').insert(data);
          if (error) throw error;
        }
      } else if (dialogType === 'module') {
        data.track_id = parentId;
        data.is_active = formIsActive;
        data.certificate_enabled = formCertificateEnabled;
        data.instructor_name = formInstructorName || null;
        data.certificate_template_id = formCertificateTemplateId;
        data.certificate_title = formCertificateTitle || null;
        data.course_hours = formCourseHours;
        data.certificate_expiry_days = formCertificateExpiryDays;
        if (editingItem) {
          const { error } = await supabase.from('modules').update(data).eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('modules').insert(data);
          if (error) throw error;
        }
      } else if (dialogType === 'video') {
        data.module_id = parentId;
        data.video_url = formVideoUrl;
        data.is_required = formIsRequired;
        data.allow_mark_complete = formAllowMarkComplete;
        if (editingItem) {
          const { error } = await supabase.from('videos').update(data).eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('videos').insert(data);
          if (error) throw error;
        }
      } else if (dialogType === 'quiz') {
        data.module_id = parentId;
        data.passing_score = formPassingScore;
        data.max_attempts = formMaxAttempts;
        data.is_required = formIsRequired;
        if (editingItem) {
          const { error } = await supabase.from('quizzes').update(data).eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('quizzes').insert(data);
          if (error) throw error;
        }
      } else if (dialogType === 'homework') {
        data.module_id = parentId;
        data.instructions = formInstructions;
        data.due_days = formDueDays;
        data.is_required = formIsRequired;
        data.file_required = formFileRequired;
        if (editingItem) {
          const { error } = await supabase.from('homework_assignments').update(data).eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('homework_assignments').insert(data);
          if (error) throw error;
        }
      } else if (dialogType === 'presentation') {
        if (!formFileUrl.trim()) {
          toast({ title: 'File Required', description: 'Please upload a PowerPoint file.', variant: 'destructive' });
          return;
        }
        data.module_id = parentId;
        data.file_url = formFileUrl;
        data.file_name = formFileName;
        data.is_required = formIsRequired;
        data.allow_mark_complete = formAllowMarkComplete;
        data.allow_download = formAllowDownload;
        if (editingItem) {
          const { error } = await supabase.from('module_presentations').update(data).eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('module_presentations').insert(data);
          if (error) throw error;
        }
      } else if (dialogType === 'document') {
        if (!formFileUrl.trim()) {
          toast({ title: 'File Required', description: 'Please upload a PDF file.', variant: 'destructive' });
          return;
        }
        data.module_id = parentId;
        data.file_url = formFileUrl;
        data.file_name = formFileName;
        data.is_required = formIsRequired;
        data.allow_mark_complete = formAllowMarkComplete;
        data.allow_download = formAllowDownload;
        if (editingItem) {
          const { error } = await supabase.from('module_documents').update(data).eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('module_documents').insert(data);
          if (error) throw error;
        }
      } else if (dialogType === 'external_training') {
        if (!formExternalUrl.trim()) {
          toast({ title: 'URL Required', description: 'Please enter the external training URL.', variant: 'destructive' });
          return;
        }
        data.module_id = parentId;
        data.external_url = formExternalUrl;
        data.requires_certificate = formRequiresCertificate;
        data.is_required = formIsRequired;
        if (editingItem) {
          const { error } = await supabase.from('module_external_trainings').update(data).eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('module_external_trainings').insert(data);
          if (error) throw error;
        }
      } else if (dialogType === 'lesson') {
        data.module_id = parentId;
        data.is_required = formIsRequired;
        if (editingItem) {
          const { error } = await supabase.from('module_lessons').update(data).eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('module_lessons').insert(data);
          if (error) throw error;
        }
      }

      toast({ title: editingItem ? 'Updated Successfully' : 'Created Successfully' });

      setIsDialogOpen(false);
      fetchTracks();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (table: 'training_tracks' | 'modules' | 'videos' | 'quizzes' | 'homework_assignments' | 'module_presentations' | 'module_documents' | 'module_external_trainings' | 'module_lessons', id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted Successfully' });
      fetchTracks();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getDialogTitle = () => {
    const action = editingItem ? 'Edit' : 'Add';
    switch (dialogType) {
      case 'track': return `${action} Training Track`;
      case 'module': return `${action} Module`;
      case 'video': return `${action} Video`;
      case 'quiz': return `${action} Quiz`;
      case 'homework': return `${action} Homework Assignment`;
      case 'presentation': return `${action} PowerPoint`;
      case 'document': return `${action} PDF Document`;
      case 'external_training': return `${action} External Training`;
      case 'lesson': return `${action} Lesson`;
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = tracks.findIndex((t) => t.id === active.id);
    const newIndex = tracks.findIndex((t) => t.id === over.id);

    const newTracks = arrayMove(tracks, oldIndex, newIndex);
    setTracks(newTracks);

    // Update order_index in database
    try {
      const updates = newTracks.map((track, index) => ({
        id: track.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from('training_tracks')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      toast({ title: 'Order updated' });
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({ title: 'Error updating order', variant: 'destructive' });
      fetchTracks(); // Revert on error
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
            <p className="text-muted-foreground">
              Manage training tracks, modules, videos, quizzes, and homework.
            </p>
          </div>
        </div>

        <Tabs defaultValue="tracks" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="tracks" className="text-xs sm:text-sm">
              <BookOpen className="h-4 w-4 mr-1 sm:mr-2" />
              Tracks
            </TabsTrigger>
            <TabsTrigger value="homework" className="text-xs sm:text-sm">
              <ClipboardCheck className="h-4 w-4 mr-1 sm:mr-2" />
              Homework
            </TabsTrigger>
            <TabsTrigger value="external-training" className="text-xs sm:text-sm">
              <ExternalLink className="h-4 w-4 mr-1 sm:mr-2" />
              External Training
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => openDialog('track')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Track
              </Button>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">Loading content...</p>
            ) : tracks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground" />
                  <h2 className="mt-4 text-xl font-semibold">No Training Tracks</h2>
                  <p className="mt-2 text-muted-foreground">Create your first training track to get started.</p>
                  <Button className="mt-4" onClick={() => openDialog('track')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Training Track
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tracks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {tracks.map((track) => (
                      <SortableTrackCard
                        key={track.id}
                        track={track}
                        onOpenDialog={openDialog}
                        onDelete={handleDelete}
                        onRefetch={fetchTracks}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </TabsContent>

          <TabsContent value="homework" className="space-y-6">
            <HomeworkReviewTab />
          </TabsContent>

          <TabsContent value="external-training" className="space-y-6">
            <ExternalTrainingReviewTab />
          </TabsContent>
        </Tabs>

        {/* Content Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{getDialogTitle()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enter title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Enter description"
                />
              </div>

              {(dialogType === 'track' || dialogType === 'module') && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={formIsActive}
                    onCheckedChange={setFormIsActive}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
               )}

              {dialogType === 'module' && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  <p className="text-sm font-medium">Module Certificate</p>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="moduleCertificateEnabled"
                      checked={formCertificateEnabled}
                      onCheckedChange={setFormCertificateEnabled}
                    />
                    <Label htmlFor="moduleCertificateEnabled">Issue certificate on module completion</Label>
                  </div>
                  {formCertificateEnabled && (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="moduleCertTitle">Certificate Title</Label>
                        <Input
                          id="moduleCertTitle"
                          value={formCertificateTitle}
                          onChange={(e) => setFormCertificateTitle(e.target.value)}
                          placeholder='e.g. Certificate of Completion - Module Name'
                        />
                        <p className="text-xs text-muted-foreground mt-1">Title shown on the certificate. Defaults to "[Module Title] - Certificate of Completion" if left blank.</p>
                      </div>
                      <div>
                        <Label htmlFor="moduleInstructorName">Instructor Name *</Label>
                        <Input
                          id="moduleInstructorName"
                          value={formInstructorName}
                          onChange={(e) => setFormInstructorName(e.target.value)}
                          placeholder="Enter instructor name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="moduleCourseHours">Course Hours</Label>
                        <Input
                          id="moduleCourseHours"
                          type="number"
                          value={formCourseHours ?? ''}
                          onChange={(e) => setFormCourseHours(e.target.value ? Number(e.target.value) : null)}
                          placeholder="e.g. 40"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Number of training hours earned upon completion.</p>
                      </div>
                      <div>
                        <Label htmlFor="moduleCertExpiry">Certificate Expiry (days after issue)</Label>
                        <Input
                          id="moduleCertExpiry"
                          type="number"
                          value={formCertificateExpiryDays ?? ''}
                          onChange={(e) => setFormCertificateExpiryDays(e.target.value ? Number(e.target.value) : null)}
                          placeholder="Leave blank for no expiry"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Optional. Number of days until the certificate expires after being issued.</p>
                      </div>
                      <div>
                        <Label>Certificate Template File (PDF/Image)</Label>
                        <Input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setFormCertBgUrl(URL.createObjectURL(file));
                        }} />
                      </div>
                      <CertificateTemplateEditor
                        textFields={formCertTextFields}
                        backgroundImageUrl={formCertBgUrl}
                        onTextFieldsChange={setFormCertTextFields}
                        onBackgroundChange={setFormCertBgUrl}
                      />
                    </div>
                  )}
                </div>
              )}

              {dialogType === 'track' && (
                <>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="autoAssign"
                      checked={formAutoAssign}
                      onCheckedChange={setFormAutoAssign}
                    />
                    <Label htmlFor="autoAssign">Auto-assign to new staff</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="isPriority"
                      checked={formIsPriority}
                      onCheckedChange={setFormIsPriority}
                    />
                    <Label htmlFor="isPriority">Mark as Priority</Label>
                  </div>

                  <div className="border-t pt-4 mt-4 space-y-3">
                    <p className="text-sm font-medium">Completion Certificate</p>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="certificateEnabled"
                        checked={formCertificateEnabled}
                        onCheckedChange={setFormCertificateEnabled}
                      />
                      <Label htmlFor="certificateEnabled">Issue certificate on completion</Label>
                    </div>
                     {formCertificateEnabled && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-2">Certificate Mode</p>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name="certMode" checked={formCertificateMode === 'per_track'} onChange={() => setFormCertificateMode('per_track')} className="accent-primary" />
                              Per Track — one certificate when the whole track is completed
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="radio" name="certMode" checked={formCertificateMode === 'per_module'} onChange={() => setFormCertificateMode('per_module')} className="accent-primary" />
                              Per Module — individual certificate per module (configure on each module)
                            </label>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="certTitle">Certificate Title</Label>
                          <Input
                            id="certTitle"
                            value={formCertificateTitle}
                            onChange={(e) => setFormCertificateTitle(e.target.value)}
                            placeholder='e.g. Certificate of Completion - New Hire Training'
                          />
                          <p className="text-xs text-muted-foreground mt-1">Title shown on the certificate. Defaults to "[Track Title] - Certificate of Completion" if left blank.</p>
                        </div>
                        <div>
                          <Label htmlFor="instructorName">Instructor Name *</Label>
                          <Input
                            id="instructorName"
                            value={formInstructorName}
                            onChange={(e) => setFormInstructorName(e.target.value)}
                            placeholder="Enter instructor name for certificate"
                          />
                        </div>
                        <div>
                          <Label htmlFor="courseHours">Course Hours</Label>
                          <Input
                            id="courseHours"
                            type="number"
                            value={formCourseHours ?? ''}
                            onChange={(e) => setFormCourseHours(e.target.value ? Number(e.target.value) : null)}
                            placeholder="e.g. 40"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Number of training hours earned upon completion.</p>
                        </div>
                        <div>
                          <Label htmlFor="certExpiryDays">Certificate Expiry (days after issue)</Label>
                          <Input
                            id="certExpiryDays"
                            type="number"
                            value={formCertificateExpiryDays ?? ''}
                            onChange={(e) => setFormCertificateExpiryDays(e.target.value ? Number(e.target.value) : null)}
                            placeholder="Leave blank for no expiry"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Optional. Number of days until the certificate expires after being issued.</p>
                        </div>
                        <div>
                          <Label>Certificate Template File (PDF/Image)</Label>
                          <Input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setFormCertBgUrl(URL.createObjectURL(file));
                          }} />
                        </div>
                        <CertificateTemplateEditor
                          textFields={formCertTextFields}
                          backgroundImageUrl={formCertBgUrl}
                          onTextFieldsChange={setFormCertTextFields}
                          onBackgroundChange={setFormCertBgUrl}
                        />
                      </div>
                    )}
                  </div>
                  
                  {editingItem?.id && (
                    <div className="border-t pt-4 mt-4">
                      <TrackPositionAssigner trackId={editingItem.id} />
                    </div>
                  )}

                  <div className="border-t pt-4 mt-4 space-y-3">
                    <p className="text-sm font-medium">Content Defaults for this Track</p>
                    <p className="text-xs text-muted-foreground">
                      Override system defaults for new content in this track. Leave unchecked to inherit from system settings.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="trackDefaultMarkComplete" className="text-sm">
                          Override "Allow Mark Complete"
                        </Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="trackDefaultMarkCompleteEnabled"
                            checked={formDefaultAllowMarkComplete !== null}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormDefaultAllowMarkComplete(false);
                              } else {
                                setFormDefaultAllowMarkComplete(null);
                              }
                            }}
                          />
                          {formDefaultAllowMarkComplete !== null && (
                            <Switch
                              id="trackDefaultMarkCompleteValue"
                              checked={formDefaultAllowMarkComplete}
                              onCheckedChange={setFormDefaultAllowMarkComplete}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="trackDefaultDownload" className="text-sm">
                          Override "Allow Download"
                        </Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="trackDefaultDownloadEnabled"
                            checked={formDefaultAllowDownload !== null}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormDefaultAllowDownload(false);
                              } else {
                                setFormDefaultAllowDownload(null);
                              }
                            }}
                          />
                          {formDefaultAllowDownload !== null && (
                            <Switch
                              id="trackDefaultDownloadValue"
                              checked={formDefaultAllowDownload}
                              onCheckedChange={setFormDefaultAllowDownload}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {dialogType === 'video' && (
                <VideoUploader
                  value={formVideoUrl}
                  onChange={setFormVideoUrl}
                />
              )}

              {dialogType === 'quiz' && (
                <>
                  {!editingItem && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                      💡 After creating the quiz, click the <strong>"Questions"</strong> button next to it to add your questions.
                    </div>
                  )}
                  <div>
                    <Label htmlFor="passingScore">Passing Score (%)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      value={formPassingScore}
                      onChange={(e) => setFormPassingScore(Number(e.target.value))}
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAttempts">Max Attempts (blank = unlimited)</Label>
                    <Input
                      id="maxAttempts"
                      type="number"
                      value={formMaxAttempts || ''}
                      onChange={(e) => setFormMaxAttempts(e.target.value ? Number(e.target.value) : null)}
                      min={1}
                    />
                  </div>
                </>
              )}

              {dialogType === 'homework' && (
                <>
                  <div>
                    <Label htmlFor="instructions">Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={formInstructions}
                      onChange={(e) => setFormInstructions(e.target.value)}
                      placeholder="Assignment instructions..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDays">Due Days (from assignment)</Label>
                    <Input
                      id="dueDays"
                      type="number"
                      value={formDueDays || ''}
                      onChange={(e) => setFormDueDays(e.target.value ? Number(e.target.value) : null)}
                      min={1}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="fileRequired"
                      checked={formFileRequired}
                      onCheckedChange={setFormFileRequired}
                    />
                    <Label htmlFor="fileRequired">File upload required</Label>
                  </div>
                </>
              )}

              {dialogType === 'presentation' && (
                <FileUploader
                  value={formFileUrl}
                  fileName={formFileName}
                  onChange={(url, name) => {
                    setFormFileUrl(url);
                    setFormFileName(name);
                  }}
                  accept=".ppt,.pptx,.odp"
                  label="PowerPoint File *"
                  bucket="presentations"
                />
              )}

              {dialogType === 'document' && (
                <FileUploader
                  value={formFileUrl}
                  fileName={formFileName}
                  onChange={(url, name) => {
                    setFormFileUrl(url);
                    setFormFileName(name);
                  }}
                  accept=".pdf"
                  label="PDF File *"
                />
              )}

              {dialogType === 'external_training' && (
                <>
                  <div>
                    <Label htmlFor="externalUrl">Training URL *</Label>
                    <Input
                      id="externalUrl"
                      value={formExternalUrl}
                      onChange={(e) => setFormExternalUrl(e.target.value)}
                      placeholder="https://example.com/training"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="requiresCertificate"
                      checked={formRequiresCertificate}
                      onCheckedChange={setFormRequiresCertificate}
                    />
                    <Label htmlFor="requiresCertificate">Require certificate upload</Label>
                  </div>
                </>
              )}

              {(dialogType === 'video' || dialogType === 'quiz' || dialogType === 'homework' || dialogType === 'presentation' || dialogType === 'document' || dialogType === 'external_training' || dialogType === 'lesson') && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="required"
                    checked={formIsRequired}
                    onCheckedChange={setFormIsRequired}
                  />
                  <Label htmlFor="required">Required</Label>
                </div>
              )}

              {(dialogType === 'video' || dialogType === 'presentation' || dialogType === 'document') && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="allowMarkComplete"
                    checked={formAllowMarkComplete}
                    onCheckedChange={setFormAllowMarkComplete}
                  />
                  <Label htmlFor="allowMarkComplete" className="flex items-center gap-1">
                    Allow Mark Complete
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>When disabled, users cannot manually skip this content. They must {dialogType === 'video' ? 'watch the entire video' : 'view the content for at least 30 seconds'} to complete it.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              )}

              {(dialogType === 'presentation' || dialogType === 'document') && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="allowDownload"
                    checked={formAllowDownload}
                    onCheckedChange={setFormAllowDownload}
                  />
                  <Label htmlFor="allowDownload" className="flex items-center gap-1">
                    Allow Download
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>When disabled, the download button will be hidden from users viewing this content.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingItem ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
