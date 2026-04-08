import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  expires_at: string | null;
}

export function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
    
    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      setDismissedIds(JSON.parse(dismissed));
    }
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissAnnouncement = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  if (isLoading || visibleAnnouncements.length === 0) {
    return null;
  }

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          card: 'border-destructive/50 bg-destructive/5',
          icon: AlertTriangle,
          iconClass: 'text-destructive',
          badge: 'destructive' as const,
        };
      case 'important':
        return {
          card: 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20',
          icon: Bell,
          iconClass: 'text-yellow-600 dark:text-yellow-400',
          badge: 'default' as const,
        };
      default:
        return {
          card: 'border-primary/30 bg-primary/5',
          icon: Info,
          iconClass: 'text-primary',
          badge: 'secondary' as const,
        };
    }
  };

  return (
    <div className="space-y-3">
      {visibleAnnouncements.map((announcement) => {
        const styles = getPriorityStyles(announcement.priority);
        const Icon = styles.icon;

        return (
          <Card key={announcement.id} className={styles.card}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${styles.iconClass}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{announcement.title}</h4>
                    {announcement.priority !== 'normal' && (
                      <Badge variant={styles.badge} className="text-xs">
                        {announcement.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{announcement.content}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Posted {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => dismissAnnouncement(announcement.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
