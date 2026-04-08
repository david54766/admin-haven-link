import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Bell, MapPin, Mail } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  center_id: string | null;
}

interface Center {
  id: string;
  name: string;
}

export function AnnouncementManager() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [centers, setCenters] = useState<Center[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sendEmail, setSendEmail] = useState(true);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal',
    expires_at: '',
    center_id: 'all',
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchCenters();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      const { data, error } = await supabase.from('centers').select('id, name').order('name');
      if (error) throw error;
      setCenters(data || []);
    } catch (error) {
      console.error('Error fetching centers:', error);
    }
  };


  const handleCreate = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('admin_announcements').insert({
        title: newAnnouncement.title.trim(),
        content: newAnnouncement.content.trim(),
        priority: newAnnouncement.priority,
        created_by: user?.id,
        expires_at: newAnnouncement.expires_at || null,
        center_id: newAnnouncement.center_id === 'all' ? null : newAnnouncement.center_id,
      } as any);

      if (error) throw error;

      // Send email notification if toggled on
      if (sendEmail) {
        try {
          await supabase.functions.invoke('send-announcement-email', {
            body: {
              title: newAnnouncement.title.trim(),
              content: newAnnouncement.content.trim(),
              priority: newAnnouncement.priority,
              centerId: newAnnouncement.center_id === 'all' ? null : newAnnouncement.center_id,
            },
          });
          toast({
            title: 'Announcement created & emailed',
            description: 'Staff will see this on their dashboard and receive an email.',
          });
        } catch (emailError) {
          console.error('Email send failed:', emailError);
          toast({
            title: 'Announcement created',
            description: 'Posted to dashboard. Email delivery failed.',
          });
        }
      } else {
        toast({
          title: 'Announcement created',
          description: 'Staff will see this on their dashboard.',
        });
      }

      setNewAnnouncement({ title: '', content: '', priority: 'normal', expires_at: '', center_id: 'all' });
      setSendEmail(true);
      setIsDialogOpen(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Announcement deleted' });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'important':
        return <Badge>Important</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Staff Announcements
            </CardTitle>
            <CardDescription>
              Create updates visible on staff dashboards
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  This will be visible to all approved staff on their dashboard.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Announcement title..."
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Announcement details..."
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newAnnouncement.priority}
                      onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires (optional)</Label>
                    <Input
                      id="expires"
                      type="date"
                      value={newAnnouncement.expires_at}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expires_at: e.target.value })}
                    />
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label>
                      <MapPin className="inline h-3.5 w-3.5 mr-1" />
                      Target Location
                    </Label>
                    <Select
                      value={newAnnouncement.center_id}
                      onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, center_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {centers.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      Send Email to Staff
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Email all targeted staff about this announcement
                    </p>
                  </div>
                  <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : announcements.length === 0 ? (
          <p className="text-muted-foreground text-sm">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="flex items-start justify-between gap-4 p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{announcement.title}</span>
                    {getPriorityBadge(announcement.priority)}
                    {!announcement.is_active && (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                    {announcement.center_id ? (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {centers.find(c => c.id === announcement.center_id)?.name || 'Center'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">All Locations</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                    {announcement.expires_at && (
                      <> · Expires {format(new Date(announcement.expires_at), 'MMM d, yyyy')}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={announcement.is_active}
                    onCheckedChange={() => toggleActive(announcement.id, announcement.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAnnouncement(announcement.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
