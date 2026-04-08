import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageSquare, User, Calendar, Tag, Reply, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ReflectionResponseDialog } from './ReflectionResponseDialog';

interface ReflectionResponse {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface Reflection {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  tags: string[] | null;
  is_private: boolean;
  created_at: string;
  module?: {
    id: string;
    title: string;
  } | null;
  profile?: {
    full_name: string;
    email: string;
    center_id: string | null;
  };
  responses?: ReflectionResponse[];
}

interface CenterOption {
  id: string;
  name: string;
}

const MOOD_EMOJI: Record<string, string> = {
  excited: '🎉',
  happy: '😊',
  neutral: '😐',
  confused: '😕',
  frustrated: '😤',
};

export function AdminReflectionsView() {
  const { isSuperAdmin, profile: adminProfile } = useAuth();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [users, setUsers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<{ id: string; staffName: string } | null>(null);

  useEffect(() => {
    fetchReflections();
    if (isSuperAdmin) {
      fetchCenters();
    }
  }, []);

  const fetchCenters = async () => {
    try {
      const { data, error } = await supabase.from('centers').select('id, name').order('name');
      if (error) throw error;
      setCenters(data || []);
    } catch (error) {
      console.error('Error fetching centers:', error);
    }
  };

  const fetchReflections = async () => {
    try {
      // Fetch reflections that are not private (is_private = false means shared with admin)
      const { data: reflectionsData, error: reflectionsError } = await supabase
        .from('self_reflections')
        .select(`
          *,
          module:modules(id, title)
        `)
        .eq('is_private', false)
        .order('created_at', { ascending: false });

      if (reflectionsError) throw reflectionsError;

      // Fetch responses for all reflections
      const reflectionIds = (reflectionsData || []).map((r) => r.id);
      const { data: responsesData } = await supabase
        .from('reflection_responses')
        .select('*')
        .in('reflection_id', reflectionIds)
        .order('created_at', { ascending: true });

      const responsesMap = new Map<string, ReflectionResponse[]>();
      (responsesData || []).forEach((resp) => {
        const existing = responsesMap.get(resp.reflection_id) || [];
        responsesMap.set(resp.reflection_id, [...existing, resp]);
      });

      // Fetch profiles for the users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, center_id')
        .eq('status', 'approved');

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      
      const enrichedReflections = (reflectionsData || []).map((r) => ({
        ...r,
        profile: profileMap.get(r.user_id),
        responses: responsesMap.get(r.id) || [],
      })) as Reflection[];

      setReflections(enrichedReflections);

      // Get unique users for filter
      const uniqueUsers = Array.from(
        new Map(
          enrichedReflections
            .filter((r) => r.profile)
            .map((r) => [r.user_id, { user_id: r.user_id, full_name: r.profile!.full_name }])
        ).values()
      );
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching reflections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenResponseDialog = (reflectionId: string, staffName: string) => {
    setSelectedReflection({ id: reflectionId, staffName });
    setResponseDialogOpen(true);
  };

  const filteredReflections = reflections.filter((reflection) => {
    const matchesSearch =
      searchQuery === '' ||
      reflection.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reflection.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reflection.profile?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reflection.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesUser = userFilter === 'all' || reflection.user_id === userFilter;

    // Center filtering: non-super admins only see their center's reflections
    const matchesCenter = isSuperAdmin
      ? (centerFilter === 'all' || reflection.profile?.center_id === centerFilter)
      : (!adminProfile?.center_id || reflection.profile?.center_id === adminProfile.center_id);

    return matchesSearch && matchesUser && matchesCenter;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading reflections...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Staff Self-Reflections
        </CardTitle>
        <CardDescription>
          Staff training reflections shared with administrators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reflections, tags, or staff names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <User className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSuperAdmin && centers.length > 0 && (
            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Centers</SelectItem>
                {centers.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          {filteredReflections.length} reflection{filteredReflections.length !== 1 ? 's' : ''} found
        </p>

        {/* Reflections List */}
        {filteredReflections.length === 0 ? (
          <div className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No reflections found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery || userFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Staff reflections shared with admins will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReflections.map((reflection) => (
              <div
                key={reflection.id}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {reflection.profile ? getInitials(reflection.profile.full_name) : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {reflection.profile?.full_name || 'Unknown User'}
                        </span>
                        {reflection.mood && MOOD_EMOJI[reflection.mood] && (
                          <span className="text-lg" title={reflection.mood}>
                            {MOOD_EMOJI[reflection.mood]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(reflection.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    {reflection.title && (
                      <h4 className="mt-1 font-medium text-foreground">{reflection.title}</h4>
                    )}
                    {reflection.module && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Module: {reflection.module.title}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-3 pl-13">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {reflection.content}
                  </p>
                </div>

                {/* Tags */}
                {reflection.tags && reflection.tags.length > 0 && (
                  <div className="mt-3 pl-13 flex items-center gap-2 flex-wrap">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {reflection.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Existing Responses */}
                {reflection.responses && reflection.responses.length > 0 && (
                  <div className="mt-4 pl-13 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Admin Responses:</p>
                    {reflection.responses.map((response) => (
                      <div
                        key={response.id}
                        className="rounded-md bg-primary/5 border border-primary/10 p-3"
                      >
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {response.content}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(response.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Button */}
                <div className="mt-3 pl-13">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleOpenResponseDialog(
                        reflection.id,
                        reflection.profile?.full_name || 'Staff Member'
                      )
                    }
                  >
                    <Reply className="mr-2 h-4 w-4" />
                    Reply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Response Dialog */}
      {selectedReflection && (
        <ReflectionResponseDialog
          open={responseDialogOpen}
          onOpenChange={setResponseDialogOpen}
          reflectionId={selectedReflection.id}
          staffName={selectedReflection.staffName}
          onSuccess={fetchReflections}
        />
      )}
    </Card>
  );
}
