import { forwardRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Edit, Trash2, GripVertical, PlayCircle, FileQuestion, FileText, Presentation, FileType, ListChecks, ExternalLink, BookOpen } from 'lucide-react';
import { Module, Video, Quiz, HomeworkAssignment, ModulePresentation, ModuleDocument, ModuleExternalTraining, ModuleLesson } from '@/types/database';
import { QuizQuestionManager } from './QuizQuestionManager';
import { LessonPageEditor } from './LessonPageEditor';

interface SortableModuleItemProps {
  module: Module;
  index: number;
  trackId: string;
  onOpenDialog: (type: 'track' | 'module' | 'video' | 'quiz' | 'homework' | 'presentation' | 'document' | 'external_training' | 'lesson', item?: any, parent?: string) => void;
  onDelete: (table: 'training_tracks' | 'modules' | 'videos' | 'quizzes' | 'homework_assignments' | 'module_presentations' | 'module_documents' | 'module_external_trainings' | 'module_lessons', id: string) => void;
  onRefresh?: () => void;
}

export const SortableModuleItem = forwardRef<HTMLDivElement, SortableModuleItemProps>(
  function SortableModuleItem({ module, index, trackId, onOpenDialog, onDelete, onRefresh }, ref) {
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<ModuleLesson | null>(null);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: module.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const videos = ((module as any).videos || []) as Video[];
    const quizzes = ((module as any).quizzes || []) as Quiz[];
    const homework = ((module as any).homework_assignments || []) as HomeworkAssignment[];
    const presentations = ((module as any).module_presentations || []) as ModulePresentation[];
    const documents = ((module as any).module_documents || []) as ModuleDocument[];
    const externalTrainings = ((module as any).module_external_trainings || []) as ModuleExternalTraining[];
    const lessons = ((module as any).module_lessons || []) as ModuleLesson[];

    return (
      <AccordionItem
        ref={setNodeRef}
        style={style}
        value={module.id}
        className={`rounded-md border px-4 ${isDragging ? 'z-50 bg-background shadow-lg' : ''}`}
      >
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">{index + 1}.</span>
            <span>{module.title}</span>
            {!module.is_active && <Badge variant="secondary">Inactive</Badge>}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={() => onOpenDialog('video', null, module.id)}>
              <PlayCircle className="mr-1 h-3 w-3" />
              Video
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenDialog('quiz', null, module.id)}>
              <FileQuestion className="mr-1 h-3 w-3" />
              Quiz
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenDialog('homework', null, module.id)}>
              <FileText className="mr-1 h-3 w-3" />
              Homework
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenDialog('presentation', null, module.id)}>
              <Presentation className="mr-1 h-3 w-3" />
              PowerPoint
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenDialog('document', null, module.id)}>
              <FileType className="mr-1 h-3 w-3" />
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenDialog('external_training', null, module.id)}>
              <ExternalLink className="mr-1 h-3 w-3" />
              External
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenDialog('lesson', null, module.id)}>
              <BookOpen className="mr-1 h-3 w-3" />
              Lesson
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onOpenDialog('module', module, trackId)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete('modules', module.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {videos.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">Videos ({videos.length})</p>
              <div className="space-y-1">
                {videos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                    <span>{video.title}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onOpenDialog('video', video, module.id)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete('videos', video.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quizzes.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">Quizzes ({quizzes.length})</p>
              <div className="space-y-1">
                {quizzes.map((quiz) => {
                  const questionCount = (quiz as any).quiz_questions?.length || quiz.questions?.length || 0;
                  return (
                  <div key={quiz.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{quiz.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {questionCount} Q{questionCount !== 1 ? 's' : ''}
                      </Badge>
                      <span className="text-muted-foreground text-xs">(Pass: {quiz.passing_score}%)</span>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm"
                        variant={questionCount === 0 ? "default" : "outline"}
                        className={`h-6 text-xs px-2 ${questionCount === 0 ? 'animate-pulse' : ''}`}
                        onClick={() => setSelectedQuiz(quiz)}
                      >
                        <ListChecks className="h-3 w-3 mr-1" />
                        {questionCount === 0 ? 'Add Questions' : 'Questions'}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onOpenDialog('quiz', quiz, module.id)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete('quizzes', quiz.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {homework.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Homework ({homework.length})</p>
              <div className="space-y-1">
                {homework.map((hw) => (
                  <div key={hw.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                    <span>{hw.title}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onOpenDialog('homework', hw, module.id)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete('homework_assignments', hw.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {presentations.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">PowerPoints ({presentations.length})</p>
              <div className="space-y-1">
                {presentations.map((pres) => (
                  <div key={pres.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                    <span>{pres.title}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onOpenDialog('presentation', pres, module.id)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete('module_presentations', pres.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">PDFs ({documents.length})</p>
              <div className="space-y-1">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                    <span>{doc.title}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onOpenDialog('document', doc, module.id)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete('module_documents', doc.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {externalTrainings.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">External Trainings ({externalTrainings.length})</p>
              <div className="space-y-1">
                {externalTrainings.map((et) => (
                  <div key={et.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{et.title}</span>
                      {et.requires_certificate && <Badge variant="secondary" className="text-xs">Cert Required</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onOpenDialog('external_training', et, module.id)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete('module_external_trainings', et.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lessons */}
          {lessons.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-2">Lessons ({lessons.length})</p>
              <div className="space-y-1">
                {lessons.map((lesson) => {
                  const pageCount = (lesson as any).lesson_pages?.length || 0;
                  return (
                    <div key={lesson.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span>{lesson.title}</span>
                        <Badge variant="secondary" className="text-xs">
                          {pageCount} page{pageCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={pageCount === 0 ? "default" : "outline"}
                          className={`h-6 text-xs px-2 ${pageCount === 0 ? 'animate-pulse' : ''}`}
                          onClick={() => setSelectedLesson(lesson)}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          {pageCount === 0 ? 'Add Pages' : 'Pages'}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onOpenDialog('lesson', lesson, module.id)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete('module_lessons', lesson.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {videos.length === 0 && quizzes.length === 0 && homework.length === 0 && presentations.length === 0 && documents.length === 0 && externalTrainings.length === 0 && lessons.length === 0 && (
            <p className="text-sm text-muted-foreground">No content yet. Add videos, quizzes, homework, PowerPoints, PDFs, external trainings, or lessons above.</p>
          )}

          {/* Quiz Question Manager Dialog */}
          {selectedQuiz && (
            <QuizQuestionManager
              quiz={selectedQuiz}
              open={!!selectedQuiz}
              onOpenChange={(open) => !open && setSelectedQuiz(null)}
              onQuestionsUpdated={onRefresh}
            />
          )}

          {/* Lesson Page Editor Dialog */}
          {selectedLesson && (
            <LessonPageEditor
              lessonId={selectedLesson.id}
              lessonTitle={selectedLesson.title}
              open={!!selectedLesson}
              onOpenChange={(open) => !open && setSelectedLesson(null)}
              onUpdated={onRefresh}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    );
  }
);
