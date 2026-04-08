import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalendarEvent = {
  id: string; title: string; description: string | null; event_date: string;
  event_time: string | null; color: string | null; admin_only: boolean;
};

export default function StaffCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewEvent, setViewEvent] = useState<CalendarEvent | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ['staff-calendar-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('calendar_events').select('*').eq('admin_only', false).order('event_date');
      if (error) throw error;
      return (data || []) as unknown as CalendarEvent[];
    },
  });

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
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>

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
                        <div key={ev.id} onClick={(e) => { e.stopPropagation(); setViewEvent(ev); }}
                          className="text-[10px] leading-tight truncate rounded px-1 cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: (ev.color || '#3b82f6') + '20', color: ev.color || '#3b82f6' }}>
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

        {selectedDay && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</CardTitle></CardHeader>
            <CardContent>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(ev => (
                    <div key={ev.id} onClick={() => setViewEvent(ev)} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ev.color || '#3b82f6' }} />
                      <div>
                        <p className="font-medium text-sm">{ev.title}</p>
                        {ev.event_time && <p className="text-xs text-muted-foreground">{ev.event_time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={!!viewEvent} onOpenChange={(o) => { if (!o) setViewEvent(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewEvent?.title}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {viewEvent?.event_date && <p className="text-sm"><span className="font-medium">Date:</span> {format(parseISO(viewEvent.event_date), 'PPP')}</p>}
              {viewEvent?.event_time && <p className="text-sm"><span className="font-medium">Time:</span> {viewEvent.event_time}</p>}
              {viewEvent?.description && <p className="text-sm text-muted-foreground mt-2">{viewEvent.description}</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
