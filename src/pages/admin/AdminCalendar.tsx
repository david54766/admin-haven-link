import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO, isSameMonth } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

type CalendarEvent = {
  id: string; title: string; description: string | null; event_date: string;
  event_time: string | null; color: string | null; admin_only: boolean;
  created_by: string; created_at: string;
};

export default function AdminCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [eventTime, setEventTime] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [adminOnly, setAdminOnly] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('calendar_events').select('*').order('event_date');
      if (error) throw error;
      return (data || []) as unknown as CalendarEvent[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title, description: description || null,
        event_date: eventDate ? format(eventDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        event_time: eventTime || null, color, admin_only: adminOnly, created_by: user?.id,
      };
      if (editing) {
        const { error } = await supabase.from('calendar_events').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('calendar_events').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-events'] }); toast({ title: editing ? 'Event updated' : 'Event created' }); resetForm(); },
    onError: () => toast({ title: 'Error saving event', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendar-events'] }); toast({ title: 'Event deleted' }); },
  });

  const resetForm = () => {
    setTitle(''); setDescription(''); setEventDate(undefined); setEventTime(''); setColor(EVENT_COLORS[0]); setAdminOnly(false); setEditing(null); setDialogOpen(false);
  };

  const openNew = (day?: Date) => {
    resetForm(); if (day) setEventDate(day); setDialogOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditing(ev); setTitle(ev.title); setDescription(ev.description || ''); setEventDate(parseISO(ev.event_date));
    setEventTime(ev.event_time || ''); setColor(ev.color || EVENT_COLORS[0]); setAdminOnly(ev.admin_only); setDialogOpen(true);
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart);

  const dayEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(ev => {
      const key = ev.event_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    });
    return map;
  }, [events]);

  const selectedDayEvents = selectedDay ? (dayEvents.get(format(selectedDay, 'yyyy-MM-dd')) || []) : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <Button onClick={() => openNew()} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Add Event</Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-5 w-5" /></Button>
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-5 w-5" /></Button>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="grid grid-cols-7 gap-px">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="p-1 sm:p-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground">
                  <span className="sm:hidden">{d}</span>
                  <span className="hidden sm:inline">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</span>
                </div>
              ))}
              {Array.from({ length: startDow }).map((_, i) => <div key={`empty-${i}`} className="min-h-[44px] sm:min-h-[80px]" />)}
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const evs = dayEvents.get(key) || [];
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "min-h-[44px] sm:min-h-[80px] border rounded-md p-0.5 sm:p-1 cursor-pointer transition-colors hover:bg-accent/50",
                      isSelected && "ring-2 ring-primary",
                      isToday && "bg-accent/30"
                    )}
                  >
                    <div className="text-[10px] sm:text-xs font-medium text-foreground text-center sm:text-left">{format(day, 'd')}</div>
                    {/* Mobile: dots only */}
                    <div className="flex flex-wrap gap-0.5 justify-center mt-0.5 sm:hidden">
                      {evs.slice(0, 4).map(ev => (
                        <div key={ev.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ev.color || '#3b82f6' }} />
                      ))}
                    </div>
                    {/* Desktop: text labels */}
                    <div className="hidden sm:block mt-1 space-y-0.5">
                      {evs.slice(0, 3).map(ev => (
                        <div key={ev.id} className="flex items-center gap-1 text-[10px] leading-tight truncate rounded px-1" style={{ backgroundColor: (ev.color || '#3b82f6') + '20', color: ev.color || '#3b82f6' }}>
                          {ev.admin_only && <Lock className="h-2 w-2 shrink-0" />}
                          {ev.title}
                        </div>
                      ))}
                      {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected day events */}
        {selectedDay && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => openNew(selectedDay)}><Plus className="mr-1 h-3 w-3" />Add</Button>
            </CardHeader>
            <CardContent>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(ev => (
                    <div key={ev.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between rounded-lg border p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ev.color || '#3b82f6' }} />
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1">{ev.title}{ev.admin_only && <Lock className="h-3 w-3 text-muted-foreground" />}</p>
                          {ev.event_time && <p className="text-xs text-muted-foreground">{ev.event_time}</p>}
                          {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 self-end sm:self-start">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ev)}><Pencil className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete event?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(ev.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Event' : 'New Event'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div><Label>Date</Label>
                <Popover><PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{eventDate ? format(eventDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={eventDate} onSelect={setEventDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent></Popover>
              </div>
              <div><Label>Time (optional)</Label><Input value={eventTime} onChange={e => setEventTime(e.target.value)} placeholder="e.g. 2:00 PM" /></div>
              <div><Label>Description (optional)</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div><Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {EVENT_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} className={cn("h-7 w-7 rounded-full border-2 transition-all", color === c ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={adminOnly} onCheckedChange={setAdminOnly} />
                <Label>Admin Only</Label>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!title || !eventDate || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create Event'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
