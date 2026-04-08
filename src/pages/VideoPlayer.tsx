import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { VideoPlayer as VideoEmbed } from '@/components/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { Video, VideoProgress } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export default function VideoPlayerPage() {
  const { trackId, videoId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [progress, setProgress] = useState<VideoProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (videoId && user) {
      fetchVideoData();
    }
  }, [videoId, user]);

  const fetchVideoData = async () => {
    try {
      const [videoRes, progressRes] = await Promise.all([
        supabase.from('videos').select('*').eq('id', videoId).single(),
        supabase.from('video_progress').select('*').eq('video_id', videoId).eq('user_id', user!.id).maybeSingle(),
      ]);

      if (videoRes.error) throw videoRes.error;
      setVideo(videoRes.data as Video);
      setProgress(progressRes.data as VideoProgress | null);
    } catch (error) {
      console.error('Error fetching video:', error);
      toast({
        title: 'Error',
        description: 'Failed to load video',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = async (percentComplete: number, positionSeconds: number) => {
    if (!user || !videoId || isSaving) return;

    // Only save every 10% or when complete
    if (percentComplete % 10 !== 0 && percentComplete < 95) return;

    setIsSaving(true);
    try {
      const isComplete = percentComplete >= 95;
      
      if (progress) {
        await supabase
          .from('video_progress')
          .update({
            percent_complete: percentComplete,
            last_position_seconds: positionSeconds,
            completed_at: isComplete ? new Date().toISOString() : progress.completed_at,
          })
          .eq('id', progress.id);
      } else {
        const { data } = await supabase
          .from('video_progress')
          .insert({
            user_id: user.id,
            video_id: videoId,
            percent_complete: percentComplete,
            last_position_seconds: positionSeconds,
            completed_at: isComplete ? new Date().toISOString() : null,
          })
          .select()
          .single();
        setProgress(data as VideoProgress);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const markComplete = async () => {
    if (!user || !videoId) return;

    try {
      if (progress) {
        await supabase
          .from('video_progress')
          .update({
            percent_complete: 100,
            completed_at: new Date().toISOString(),
          })
          .eq('id', progress.id);
      } else {
        await supabase.from('video_progress').insert({
          user_id: user.id,
          video_id: videoId,
          percent_complete: 100,
          last_position_seconds: 0,
          completed_at: new Date().toISOString(),
        });
      }

      toast({
        title: 'Video Completed',
        description: 'Great job! Your progress has been saved.',
      });

      // Refresh progress
      fetchVideoData();
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: 'Error',
        description: 'Failed to save progress',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </Layout>
    );
  }

  if (!video) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Video not found</p>
            <Button asChild className="mt-4">
              <Link to={`/training/${trackId}`}>Back to Track</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const isCompleted = !!progress?.completed_at;
  const allowMarkComplete = video.allow_mark_complete ?? true;

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/training/${trackId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{video.title}</h1>
              {isCompleted && (
                <Badge variant="secondary" className="bg-brand-lime/20 text-brand-lime">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            {video.description && (
              <p className="text-muted-foreground">{video.description}</p>
            )}
          </div>
        </div>

        {/* Video Player */}
        <Card className="overflow-hidden border-2">
          <CardContent className="p-0">
            <VideoEmbed
              url={video.video_url}
              title={video.title}
              startPosition={progress?.last_position_seconds || 0}
              onProgress={updateProgress}
              onComplete={markComplete}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {progress && (
              <>
                <Clock className="h-4 w-4" />
                <span>{progress.percent_complete}% watched</span>
              </>
            )}
          </div>
          <div className="flex gap-3">
            {allowMarkComplete && !isCompleted && (
              <Button variant="outline" onClick={markComplete}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Complete
              </Button>
            )}
            <Button asChild>
              <Link to={`/training/${trackId}`}>Back to Module</Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
