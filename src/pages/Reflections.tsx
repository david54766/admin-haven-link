import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Brain, TrendingUp } from 'lucide-react';
import { SelfReflection, Module, QuizAttempt, VideoProgress } from '@/types/database';
import { ReflectionPostBox } from '@/components/reflections/ReflectionPostBox';
import { ReflectionFeed } from '@/components/reflections/ReflectionFeed';
import { ProgressStats } from '@/components/reflections/ProgressStats';

export default function Reflections() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [reflections, setReflections] = useState<SelfReflection[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [videoProgress, setVideoProgress] = useState<VideoProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [reflectionsRes, modulesRes, quizRes, videoRes] = await Promise.all([
        supabase
          .from('self_reflections')
          .select('*, module:modules(*)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase.from('modules').select('*').eq('is_active', true),
        supabase
          .from('quiz_attempts')
          .select('*, quiz:quizzes(*)')
          .eq('user_id', user!.id)
          .order('started_at', { ascending: false }),
        supabase
          .from('video_progress')
          .select('*')
          .eq('user_id', user!.id),
      ]);

      setReflections((reflectionsRes.data || []) as SelfReflection[]);
      setModules((modulesRes.data || []) as Module[]);
      setQuizAttempts((quizRes.data || []) as QuizAttempt[]);
      setVideoProgress((videoRes.data || []) as VideoProgress[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePost = async (data: { 
    title: string; 
    content: string; 
    moduleId: string;
    mood: string;
    tags: string[];
    isPrivate: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('self_reflections').insert({
        user_id: user!.id,
        title: data.title || null,
        content: data.content,
        module_id: data.moduleId || null,
        mood: data.mood || null,
        tags: data.tags.length > 0 ? data.tags : null,
        is_private: data.isPrivate,
      });

      if (error) throw error;
      
      toast({ title: 'Reflection posted!' });
      fetchData();
    } catch (error: any) {
      console.error('Post error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to post reflection.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id: string, data: { 
    title: string; 
    content: string; 
    moduleId: string;
    mood: string;
    tags: string[];
    isPrivate: boolean;
  }) => {
    try {
      const { error } = await supabase
        .from('self_reflections')
        .update({
          title: data.title || null,
          content: data.content,
          module_id: data.moduleId || null,
          mood: data.mood || null,
          tags: data.tags.length > 0 ? data.tags : null,
          is_private: data.isPrivate,
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Reflection updated' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update reflection.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reflection?')) return;

    try {
      const { error } = await supabase
        .from('self_reflections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Reflection deleted' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete reflection.',
        variant: 'destructive',
      });
    }
  };

  const completedVideos = videoProgress.filter((v) => v.completed_at).length;
  const passedQuizzes = quizAttempts.filter((q) => q.passed).length;
  const failedQuizzes = quizAttempts.filter((q) => !q.passed && q.completed_at).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50">
              <Brain className="h-3 w-3 text-brand-purple" />
              <span className="text-xs font-medium text-foreground">Growth Journal</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Self Reflection</h1>
          <p className="text-muted-foreground mt-1">
            Document your learning journey and track your progress.
          </p>
        </div>

        <Tabs defaultValue="reflections" className="space-y-6">
          <TabsList className="bg-accent/50 p-1">
            <TabsTrigger value="reflections" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Brain className="h-4 w-4 mr-2" />
              My Reflections
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Progress Recap
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reflections" className="space-y-6">
            {/* Post Box */}
            <ReflectionPostBox 
              modules={modules} 
              onSubmit={handlePost}
              isSubmitting={isSubmitting}
            />
            
            {/* Feed */}
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading reflections...</p>
            ) : (
              <ReflectionFeed
                reflections={reflections}
                modules={modules}
                onEdit={handleEdit}
                onDelete={handleDelete}
                userName={profile?.full_name || 'You'}
              />
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <ProgressStats
              completedVideos={completedVideos}
              passedQuizzes={passedQuizzes}
              failedQuizzes={failedQuizzes}
              quizAttempts={quizAttempts}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
