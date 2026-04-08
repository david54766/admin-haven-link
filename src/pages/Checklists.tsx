import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, CheckCircle, Send } from 'lucide-react';
import { format } from 'date-fns';

interface ChecklistTemplate {
  id: string;
  title: string;
  description: string | null;
  items: { id: string; label: string; order_index: number; section: string | null }[];
}

interface ItemState {
  item_id: string;
  is_checked: boolean;
  notes: string;
}

export default function Checklists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [submittedToday, setSubmittedToday] = useState<Set<string>>(new Set());
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [itemStates, setItemStates] = useState<Map<string, ItemState>>(new Map());
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch active templates
      const { data: templatesData } = await supabase
        .from('checklist_templates')
        .select('id, title, description')
        .eq('is_active', true)
        .order('created_at');

      const withItems: ChecklistTemplate[] = [];
      for (const t of templatesData || []) {
        const { data: items } = await supabase
          .from('checklist_items')
          .select('id, label, order_index, section')
          .eq('template_id', t.id)
          .order('order_index');
        withItems.push({ ...t, items: (items || []) as ChecklistTemplate['items'] });
      }
      setTemplates(withItems);

      // Check which templates have been submitted today
      const { data: todaySubmissions } = await supabase
        .from('checklist_submissions')
        .select('template_id')
        .eq('user_id', user!.id)
        .eq('submission_date', today);

      const submitted = new Set((todaySubmissions || []).map(s => s.template_id));
      setSubmittedToday(submitted);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startChecklist = (template: ChecklistTemplate) => {
    setActiveTemplate(template.id);
    setGeneralNotes('');
    const states = new Map<string, ItemState>();
    template.items.forEach(item => {
      states.set(item.id, { item_id: item.id, is_checked: false, notes: '' });
    });
    setItemStates(states);
  };

  const toggleItem = (itemId: string) => {
    setItemStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        newMap.set(itemId, { ...current, is_checked: !current.is_checked });
      }
      return newMap;
    });
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setItemStates(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        newMap.set(itemId, { ...current, notes });
      }
      return newMap;
    });
  };

  const handleSubmit = async () => {
    if (!activeTemplate || !user) return;

    setIsSubmitting(true);
    try {
      // Create submission
      const { data: submission, error: subError } = await supabase
        .from('checklist_submissions')
        .insert({
          template_id: activeTemplate,
          user_id: user.id,
          submission_date: today,
          notes: generalNotes || null,
        })
        .select()
        .single();

      if (subError) throw subError;

      // Create submission items
      const itemEntries = Array.from(itemStates.values()).map(state => ({
        submission_id: submission.id,
        item_id: state.item_id,
        is_checked: state.is_checked,
        notes: state.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('checklist_submission_items')
        .insert(itemEntries);

      if (itemsError) throw itemsError;

      toast({ title: 'Checklist submitted!', description: 'Your daily checklist has been sent to admin.' });

      // Send email notification to center admins
      const templateData = templates.find(t => t.id === activeTemplate);
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, center_id')
          .eq('user_id', user.id)
          .single();

        await supabase.functions.invoke('send-checklist-notification', {
          body: {
            templateTitle: templateData?.title || 'Daily Checklist',
            staffName: profileData?.full_name || 'Staff Member',
            centerId: profileData?.center_id || null,
          },
        });
      } catch (emailError) {
        console.error('Email notification failed (non-blocking):', emailError);
      }

      setActiveTemplate(null);
      setItemStates(new Map());
      setGeneralNotes('');
      fetchData();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: 'Already submitted', description: 'You have already submitted this checklist today.', variant: 'destructive' });
      } else {
        toast({ title: 'Error submitting checklist', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTemplateData = templates.find(t => t.id === activeTemplate);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading checklists...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50">
              <ClipboardCheck className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-foreground">Daily Tasks</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Checklists</h1>
          <p className="text-muted-foreground mt-1">Complete your assigned checklists before the end of your shift.</p>
        </div>

        {activeTemplateData ? (
          /* Active checklist form */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{activeTemplateData.title}</CardTitle>
                  {activeTemplateData.description && (
                    <CardDescription>{activeTemplateData.description}</CardDescription>
                  )}
                </div>
                <Button variant="ghost" onClick={() => setActiveTemplate(null)}>Back</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const sections: { section: string | null; items: typeof activeTemplateData.items }[] = [];
                activeTemplateData.items.forEach(item => {
                  const last = sections[sections.length - 1];
                  if (last && last.section === item.section) {
                    last.items.push(item);
                  } else {
                    sections.push({ section: item.section, items: [item] });
                  }
                });
                return sections.map((group, gi) => (
                  <div key={gi} className="space-y-3">
                    {group.section && (
                      <h3 className="text-base font-semibold text-foreground border-b pb-2">
                        {group.section}
                      </h3>
                    )}
                    {group.items.map(item => {
                      const state = itemStates.get(item.id);
                      return (
                        <div key={item.id} className={`p-4 rounded-lg border-2 transition-colors ${state?.is_checked ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20' : 'border-muted'}`}>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={state?.is_checked || false}
                              onCheckedChange={() => toggleItem(item.id)}
                              id={`item-${item.id}`}
                            />
                            <label htmlFor={`item-${item.id}`} className="text-sm font-medium cursor-pointer flex-1">
                              {item.label}
                            </label>
                          </div>
                          <div className="mt-2 ml-7">
                            <Textarea
                              placeholder="Add notes (optional)..."
                              value={state?.notes || ''}
                              onChange={e => updateItemNotes(item.id, e.target.value)}
                              className="text-sm min-h-[60px]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}

              <div className="pt-4 border-t">
                <label className="text-sm font-medium">Additional Notes</label>
                <Textarea
                  placeholder="Any general notes for today..."
                  value={generalNotes}
                  onChange={e => setGeneralNotes(e.target.value)}
                  className="mt-2"
                />
              </div>

              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="lg">
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Checklist'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Checklist selection */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No checklists assigned yet.</p>
                </CardContent>
              </Card>
            ) : (
              templates.map(template => {
                const isSubmitted = submittedToday.has(template.id);
                return (
                  <Card key={template.id} className={`transition-all ${isSubmitted ? 'opacity-75' : 'hover:shadow-md'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        {isSubmitted && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 shrink-0">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <CardDescription>{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{template.items.length} items</p>
                      {isSubmitted ? (
                        <p className="text-sm text-green-600 dark:text-green-400">Submitted today ✓</p>
                      ) : (
                        <Button onClick={() => startChecklist(template)} className="w-full">
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          Start Checklist
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
