import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChevronLeft, ChevronRight, Upload, Image } from 'lucide-react';
import { LessonPage } from '@/types/database';

interface LessonPageEditorProps {
  lessonId: string;
  lessonTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function LessonPageEditor({ lessonId, lessonTitle, open, onOpenChange, onUpdated }: LessonPageEditorProps) {
  const { toast } = useToast();
  const [pages, setPages] = useState<LessonPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (open) fetchPages();
  }, [open, lessonId]);

  const fetchPages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('lesson_pages')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('page_number');

    if (!error) {
      if (data && data.length > 0) {
        setPages(data as LessonPage[]);
      } else {
        // Create first page automatically
        const { data: newPage } = await supabase
          .from('lesson_pages')
          .insert({ lesson_id: lessonId, page_number: 1, content: '' })
          .select()
          .single();
        if (newPage) setPages([newPage as LessonPage]);
      }
      setCurrentPageIndex(0);
    }
    setIsLoading(false);
  };

  const currentPage = pages[currentPageIndex];

  const updatePage = (field: 'content' | 'image_caption', value: string) => {
    setPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, [field]: value } : p));
  };

  const savePage = async () => {
    if (!currentPage) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('lesson_pages')
      .update({ content: currentPage.content, image_caption: currentPage.image_caption })
      .eq('id', currentPage.id);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Page saved' });
    }
    setIsSaving(false);
  };

  const addPage = async () => {
    // Save current page first
    await savePage();
    const newPageNumber = pages.length + 1;
    const { data, error } = await supabase
      .from('lesson_pages')
      .insert({ lesson_id: lessonId, page_number: newPageNumber, content: '' })
      .select()
      .single();
    if (!error && data) {
      setPages(prev => [...prev, data as LessonPage]);
      setCurrentPageIndex(pages.length);
    }
  };

  const deletePage = async () => {
    if (pages.length <= 1) {
      toast({ title: 'Cannot delete', description: 'A lesson must have at least one page.', variant: 'destructive' });
      return;
    }
    if (!confirm('Delete this page?')) return;
    const { error } = await supabase.from('lesson_pages').delete().eq('id', currentPage.id);
    if (!error) {
      const remaining = pages.filter((_, i) => i !== currentPageIndex);
      // Renumber
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].page_number !== i + 1) {
          await supabase.from('lesson_pages').update({ page_number: i + 1 }).eq('id', remaining[i].id);
          remaining[i] = { ...remaining[i], page_number: i + 1 };
        }
      }
      setPages(remaining);
      setCurrentPageIndex(Math.min(currentPageIndex, remaining.length - 1));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${lessonId}/${currentPage.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('lesson-images')
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('lesson-images').getPublicUrl(path);
    const { error } = await supabase
      .from('lesson_pages')
      .update({ image_url: publicUrl })
      .eq('id', currentPage.id);
    if (!error) {
      setPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, image_url: publicUrl } : p));
      toast({ title: 'Image uploaded' });
    }
    setIsUploading(false);
  };

  const removeImage = async () => {
    const { error } = await supabase
      .from('lesson_pages')
      .update({ image_url: null, image_caption: null })
      .eq('id', currentPage.id);
    if (!error) {
      setPages(prev => prev.map((p, i) => i === currentPageIndex ? { ...p, image_url: null, image_caption: null } : p));
    }
  };

  const handleClose = async (open: boolean) => {
    if (!open && currentPage) {
      await savePage();
      onUpdated?.();
    }
    onOpenChange(open);
  };

  const goToPage = async (index: number) => {
    await savePage();
    setCurrentPageIndex(index);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lesson: {lessonTitle}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading pages...</p>
        ) : currentPage ? (
          <div className="space-y-4">
            {/* Page navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" disabled={currentPageIndex === 0} onClick={() => goToPage(currentPageIndex - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPageIndex + 1} of {pages.length}
                </span>
                <Button size="icon" variant="outline" disabled={currentPageIndex === pages.length - 1} onClick={() => goToPage(currentPageIndex + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={addPage}>
                  <Plus className="h-3 w-3 mr-1" /> Add Page
                </Button>
                <Button size="sm" variant="ghost" onClick={deletePage} disabled={pages.length <= 1}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Text content */}
            <div>
              <Label>Page Content</Label>
              <Textarea
                value={currentPage.content}
                onChange={(e) => updatePage('content', e.target.value)}
                placeholder="Write your lesson content here..."
                className="min-h-[200px]"
              />
            </div>

            {/* Image */}
            <div>
              <Label>Page Image (optional)</Label>
              {currentPage.image_url ? (
                <div className="space-y-2 mt-2">
                  <img src={currentPage.image_url} alt="Page" className="max-h-48 rounded-md border object-contain" />
                  <div>
                    <Label>Image Caption</Label>
                    <Input
                      value={currentPage.image_caption || ''}
                      onChange={(e) => updatePage('image_caption', e.target.value)}
                      placeholder="Optional caption..."
                    />
                  </div>
                  <Button size="sm" variant="ghost" onClick={removeImage}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove Image
                  </Button>
                </div>
              ) : (
                <div className="mt-2">
                  <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Image className="h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Click to upload an image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={savePage} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Page'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
