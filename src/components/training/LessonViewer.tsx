import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { LessonPage, LessonProgress } from '@/types/database';

interface LessonViewerProps {
  lessonId: string;
  title: string;
  isCompleted: boolean;
  onComplete: () => void;
}

export function LessonViewer({ lessonId, title, isCompleted, onComplete }: LessonViewerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<LessonPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) loadLesson();
  }, [open]);

  const loadLesson = async () => {
    setIsLoading(true);
    const [pagesRes, progressRes] = await Promise.all([
      supabase.from('lesson_pages').select('*').eq('lesson_id', lessonId).order('page_number'),
      supabase.from('lesson_progress').select('*').eq('lesson_id', lessonId).eq('user_id', user!.id).maybeSingle(),
    ]);
    if (pagesRes.data) setPages(pagesRes.data as LessonPage[]);
    const progress = progressRes.data as LessonProgress | null;
    if (progress && pagesRes.data) {
      const idx = Math.min(progress.last_page_viewed - 1, (pagesRes.data.length || 1) - 1);
      setCurrentPageIndex(Math.max(0, idx));
    } else {
      setCurrentPageIndex(0);
    }
    setIsLoading(false);
  };

  const saveProgress = async (pageNumber: number) => {
    if (!user) return;
    const isLastPage = pageNumber >= pages.length;
    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('lesson_progress').update({
        last_page_viewed: pageNumber,
        ...(isLastPage && !isCompleted ? { completed_at: new Date().toISOString() } : {}),
      }).eq('id', existing.id);
    } else {
      await supabase.from('lesson_progress').insert({
        user_id: user.id,
        lesson_id: lessonId,
        last_page_viewed: pageNumber,
        ...(isLastPage ? { completed_at: new Date().toISOString() } : {}),
      });
    }

    if (isLastPage && !isCompleted) {
      toast({ title: 'Lesson completed!' });
      onComplete();
    }
  };

  const goToPage = async (index: number) => {
    setCurrentPageIndex(index);
    await saveProgress(index + 1);
  };

  const currentPage = pages[currentPageIndex];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isCompleted ? 'outline' : 'default'}>
          <BookOpen className="mr-1 h-4 w-4" />
          {isCompleted ? 'Review' : 'Read'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">This lesson has no content yet.</p>
        ) : currentPage ? (
          <div className="space-y-4">
            {/* Image */}
            {currentPage.image_url && (
              <div className="space-y-1">
                <img src={currentPage.image_url} alt={currentPage.image_caption || 'Lesson image'} className="w-full rounded-md border object-contain max-h-80" />
                {currentPage.image_caption && (
                  <p className="text-xs text-muted-foreground text-center italic">{currentPage.image_caption}</p>
                )}
              </div>
            )}

            {/* Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {currentPage.content}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t pt-4">
              <Button size="sm" variant="outline" disabled={currentPageIndex === 0} onClick={() => goToPage(currentPageIndex - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPageIndex + 1} of {pages.length}
              </span>
              {currentPageIndex < pages.length - 1 ? (
                <Button size="sm" onClick={() => goToPage(currentPageIndex + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => { saveProgress(pages.length); setOpen(false); }} variant={isCompleted ? 'outline' : 'default'}>
                  {isCompleted ? 'Done' : 'Finish'} <CheckCircle className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
