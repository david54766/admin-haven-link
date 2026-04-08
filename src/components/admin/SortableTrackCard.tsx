import { forwardRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, GripVertical, MoreVertical, RefreshCw } from 'lucide-react';
import { TrainingTrack, Module } from '@/types/database';
import { SortableModuleItem } from './SortableModuleItem';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useContentDefaults } from '@/hooks/useContentDefaults';

interface SortableTrackCardProps {
  track: TrainingTrack;
  onOpenDialog: (type: 'track' | 'module' | 'video' | 'quiz' | 'homework' | 'presentation' | 'document' | 'external_training' | 'lesson', item?: any, parent?: string) => void;
  onDelete: (table: 'training_tracks' | 'modules' | 'videos' | 'quizzes' | 'homework_assignments' | 'module_presentations' | 'module_documents' | 'module_external_trainings' | 'module_lessons', id: string) => void;
  onRefetch?: () => void;
  onModulesReordered?: () => void;
}

export const SortableTrackCard = forwardRef<HTMLDivElement, SortableTrackCardProps>(
  function SortableTrackCard({ track, onOpenDialog, onDelete, onModulesReordered, onRefetch }, ref) {
    const { toast } = useToast();
    const { getEffectiveDefaults } = useContentDefaults();
    const [isApplyingDefaults, setIsApplyingDefaults] = useState(false);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: track.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const trackModules = ((track as any).modules || []).sort((a: Module, b: Module) => a.order_index - b.order_index) as Module[];
    const [modules, setModules] = useState<Module[]>(trackModules);

    // Sync modules when track prop changes (compare full data, not just IDs)
    const trackModulesJson = JSON.stringify(trackModules);
    if (JSON.stringify(modules) !== trackModulesJson) {
      setModules(trackModules);
    }

    const moduleSensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    const handleModuleDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;
      
      if (!over || active.id === over.id) return;

      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);

      const newModules = arrayMove(modules, oldIndex, newIndex);
      setModules(newModules);

      // Update order_index in database
      try {
        const updates = newModules.map((module, index) => ({
          id: module.id,
          order_index: index,
        }));

        for (const update of updates) {
          await supabase
            .from('modules')
            .update({ order_index: update.order_index })
            .eq('id', update.id);
        }

        toast({ title: 'Module order updated' });
        onModulesReordered?.();
      } catch (error: any) {
        console.error('Error updating module order:', error);
        toast({ title: 'Error updating order', variant: 'destructive' });
        setModules(trackModules); // Revert on error
      }
    };

    const handleApplyDefaults = async () => {
      const trackDefaults = {
        default_allow_mark_complete: (track as any).default_allow_mark_complete ?? null,
        default_allow_download: (track as any).default_allow_download ?? null,
      };
      const effectiveDefaults = getEffectiveDefaults(trackDefaults);
      
      const confirmed = confirm(
        `This will update all videos, presentations, and documents in "${track.title}" to:\n\n` +
        `• Allow Mark Complete: ${effectiveDefaults.allow_mark_complete ? 'Yes' : 'No'}\n` +
        `• Allow Download: ${effectiveDefaults.allow_download ? 'Yes' : 'No'}\n\n` +
        `Continue?`
      );
      
      if (!confirmed) return;
      
      setIsApplyingDefaults(true);
      
      try {
        const moduleIds = modules.map(m => m.id);
        
        // Update videos
        const { error: videosError } = await supabase
          .from('videos')
          .update({ allow_mark_complete: effectiveDefaults.allow_mark_complete })
          .in('module_id', moduleIds);
        if (videosError) throw videosError;
        
        // Update presentations
        const { error: presentationsError } = await supabase
          .from('module_presentations')
          .update({ 
            allow_mark_complete: effectiveDefaults.allow_mark_complete,
            allow_download: effectiveDefaults.allow_download
          })
          .in('module_id', moduleIds);
        if (presentationsError) throw presentationsError;
        
        // Update documents
        const { error: documentsError } = await supabase
          .from('module_documents')
          .update({ 
            allow_mark_complete: effectiveDefaults.allow_mark_complete,
            allow_download: effectiveDefaults.allow_download
          })
          .in('module_id', moduleIds);
        if (documentsError) throw documentsError;
        
        toast({ title: 'Defaults Applied', description: `All content in "${track.title}" has been updated.` });
        onRefetch?.();
      } catch (error: any) {
        console.error('Error applying defaults:', error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setIsApplyingDefaults(false);
      }
    };

    return (
      <Card ref={setNodeRef} style={style} className={isDragging ? 'z-50' : ''}>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-2 sm:gap-3 min-w-0">
              <button
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0"
              >
                <GripVertical className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-1.5 text-base sm:text-lg">
                  <span className="truncate">{track.title}</span>
                  {(track as any).is_priority && <Badge variant="default" className="bg-destructive text-xs">Priority</Badge>}
                  {!track.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  {track.auto_assign && <Badge variant="default" className="text-xs">Auto</Badge>}
                </CardTitle>
                <CardDescription className="line-clamp-2">{track.description}</CardDescription>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0 self-end sm:self-auto">
              <Button size="sm" variant="outline" onClick={() => onOpenDialog('module', null, track.id)} className="text-xs h-8">
                <Plus className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Module</span>
                <span className="sm:hidden">+</span>
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onOpenDialog('track', track)} className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleApplyDefaults} disabled={isApplyingDefaults}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isApplyingDefaults ? 'animate-spin' : ''}`} />
                    Apply Defaults to Content
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete('training_tracks', track.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Track
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        {modules.length > 0 && (
          <CardContent>
            <DndContext
              sensors={moduleSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModuleDragEnd}
            >
              <SortableContext
                items={modules.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <Accordion type="multiple" className="space-y-2">
                  {modules.map((module, idx) => (
                    <SortableModuleItem
                      key={module.id}
                      module={module}
                      index={idx}
                      trackId={track.id}
                      onOpenDialog={onOpenDialog}
                      onDelete={onDelete}
                      onRefresh={onRefetch}
                    />
                  ))}
                </Accordion>
              </SortableContext>
            </DndContext>
          </CardContent>
        )}
      </Card>
    );
  }
);
