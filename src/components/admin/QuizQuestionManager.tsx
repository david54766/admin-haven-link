import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, Check, X, Upload, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Quiz, QuizQuestion } from '@/types/database';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuizQuestionManagerProps {
  quiz: Quiz;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionsUpdated?: () => void;
}

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

interface QuestionFormData {
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: string | string[];
  points: number;
}

const defaultFormData: QuestionFormData = {
  question_text: '',
  question_type: 'multiple_choice',
  options: ['', '', '', ''],
  correct_answer: '',
  points: 1,
};

// Sortable Question Item Component
function SortableQuestionItem({ 
  question, 
  index, 
  onEdit, 
  onDelete 
}: { 
  question: QuizQuestion; 
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'short_answer': return 'Short Answer';
      default: return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'default';
      case 'true_false': return 'secondary';
      case 'short_answer': return 'outline';
      default: return 'default';
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className={`${isDragging ? 'z-50 shadow-lg' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
                  <Badge variant={getTypeBadgeVariant(question.question_type) as any}>
                    {getTypeLabel(question.question_type)}
                  </Badge>
                  <Badge variant="outline">{question.points} pt{question.points !== 1 ? 's' : ''}</Badge>
                </div>
                <p className="text-sm font-medium truncate">{question.question_text}</p>
                {question.options && (question.options as string[]).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(question.options as string[]).filter(Boolean).map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {(Array.isArray(question.correct_answer) 
                          ? question.correct_answer.includes(opt)
                          : question.correct_answer === opt
                        ) ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground/50" />
                        )}
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
                {question.question_type === 'short_answer' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Answer: <span className="font-medium">{String(question.correct_answer)}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuizQuestionManager({ quiz, open, onOpenChange, onQuestionsUpdated }: QuizQuestionManagerProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(defaultFormData);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open && quiz.id) {
      fetchQuestions();
    }
  }, [open, quiz.id]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order_index');

      if (error) throw error;
      setQuestions((data || []) as QuizQuestion[]);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({ title: 'Error loading questions', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingQuestion(null);
    setIsEditing(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleEdit = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      question_type: question.question_type as QuestionType,
      options: question.options ? [...(question.options as string[]), '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      correct_answer: question.correct_answer as string | string[],
      points: question.points,
    });
    setIsEditing(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;

    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      
      toast({ title: 'Question deleted' });
      fetchQuestions();
      onQuestionsUpdated?.();
    } catch (error: any) {
      toast({ title: 'Error deleting question', description: error.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!formData.question_text.trim()) {
      toast({ title: 'Question text is required', variant: 'destructive' });
      return;
    }

    // Validate correct answer
    if (formData.question_type === 'multiple_choice') {
      const validOptions = formData.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast({ title: 'At least 2 options required', variant: 'destructive' });
        return;
      }
      if (!formData.correct_answer || (Array.isArray(formData.correct_answer) && formData.correct_answer.length === 0)) {
        toast({ title: 'Select the correct answer', variant: 'destructive' });
        return;
      }
    } else if (formData.question_type === 'true_false') {
      if (!formData.correct_answer) {
        toast({ title: 'Select True or False', variant: 'destructive' });
        return;
      }
    } else if (formData.question_type === 'short_answer') {
      if (!formData.correct_answer || (typeof formData.correct_answer === 'string' && !formData.correct_answer.trim())) {
        toast({ title: 'Correct answer is required', variant: 'destructive' });
        return;
      }
    }

    try {
      const questionData: any = {
        quiz_id: quiz.id,
        question_text: formData.question_text.trim(),
        question_type: formData.question_type,
        points: formData.points,
      };

      // Set options and correct_answer based on type
      if (formData.question_type === 'multiple_choice') {
        questionData.options = formData.options.filter(o => o.trim());
        questionData.correct_answer = formData.correct_answer;
      } else if (formData.question_type === 'true_false') {
        questionData.options = ['True', 'False'];
        questionData.correct_answer = formData.correct_answer;
      } else {
        questionData.options = null;
        questionData.correct_answer = typeof formData.correct_answer === 'string' 
          ? formData.correct_answer.trim() 
          : formData.correct_answer;
      }

      if (editingQuestion) {
        const { error } = await supabase
          .from('quiz_questions')
          .update(questionData)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        toast({ title: 'Question updated' });
      } else {
        // Get next order_index
        const maxOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) : -1;
        questionData.order_index = maxOrder + 1;
        
        const { error } = await supabase
          .from('quiz_questions')
          .insert(questionData);
        if (error) throw error;
        toast({ title: 'Question added' });
      }

      resetForm();
      fetchQuestions();
      onQuestionsUpdated?.();
    } catch (error: any) {
      toast({ title: 'Error saving question', description: error.message, variant: 'destructive' });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);

    const newQuestions = arrayMove(questions, oldIndex, newIndex);
    setQuestions(newQuestions);

    try {
      const updates = newQuestions.map((question, index) => ({
        id: question.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from('quiz_questions')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }

      toast({ title: 'Question order updated' });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'Error updating order', variant: 'destructive' });
      fetchQuestions();
    }
  };

  const handleTypeChange = (type: QuestionType) => {
    setFormData(prev => ({
      ...prev,
      question_type: type,
      options: type === 'true_false' ? ['True', 'False'] : type === 'multiple_choice' ? ['', '', '', ''] : [],
      correct_answer: '',
    }));
  };

  // Parse bulk import text
  const parseBulkQuestions = (text: string): Array<{
    question_text: string;
    question_type: QuestionType;
    options: string[] | null;
    correct_answer: string;
    points: number;
  }> => {
    const questions: Array<{
      question_text: string;
      question_type: QuestionType;
      options: string[] | null;
      correct_answer: string;
      points: number;
    }> = [];

    // Split by double newline to separate questions
    const blocks = text.trim().split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      // First line is the question
      const questionText = lines[0].replace(/^Q:\s*/i, '').replace(/^\d+\.\s*/, '').trim();
      if (!questionText) continue;

      let questionType: QuestionType = 'multiple_choice';
      let options: string[] = [];
      let correctAnswer = '';
      let points = 1;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Check for type
        if (/^type:\s*/i.test(line)) {
          const typeValue = line.replace(/^type:\s*/i, '').toLowerCase().trim();
          if (typeValue.includes('true') || typeValue.includes('tf')) {
            questionType = 'true_false';
          } else if (typeValue.includes('short') || typeValue.includes('text')) {
            questionType = 'short_answer';
          } else {
            questionType = 'multiple_choice';
          }
          continue;
        }

        // Check for points
        if (/^points?:\s*/i.test(line)) {
          points = parseInt(line.replace(/^points?:\s*/i, '')) || 1;
          continue;
        }

        // Check for answer
        if (/^answer:\s*/i.test(line)) {
          correctAnswer = line.replace(/^answer:\s*/i, '').trim();
          continue;
        }

        // Check for options (A), B), A., B., A:, B:, or just A B C D at start)
        const optionMatch = line.match(/^([A-Da-d])[\)\.\:\-]\s*(.+)/);
        if (optionMatch) {
          const optionText = optionMatch[2].trim();
          // Check if marked as correct with * at end or start
          const isCorrect = optionText.startsWith('*') || optionText.endsWith('*');
          const cleanOption = optionText.replace(/^\*\s*/, '').replace(/\s*\*$/, '').trim();
          options.push(cleanOption);
          if (isCorrect) {
            correctAnswer = cleanOption;
          }
          continue;
        }

        // Check for True/False answer format
        if (/^(true|false)$/i.test(line)) {
          correctAnswer = line.charAt(0).toUpperCase() + line.slice(1).toLowerCase();
          questionType = 'true_false';
          continue;
        }
      }

      // Set up question based on type
      if (questionType === 'true_false') {
        questions.push({
          question_text: questionText,
          question_type: 'true_false',
          options: ['True', 'False'],
          correct_answer: correctAnswer || 'True',
          points,
        });
      } else if (questionType === 'short_answer') {
        questions.push({
          question_text: questionText,
          question_type: 'short_answer',
          options: null,
          correct_answer: correctAnswer,
          points,
        });
      } else {
        // Multiple choice
        if (options.length >= 2) {
          questions.push({
            question_text: questionText,
            question_type: 'multiple_choice',
            options,
            correct_answer: correctAnswer || options[0],
            points,
          });
        }
      }
    }

    return questions;
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) {
      toast({ title: 'Enter questions to import', variant: 'destructive' });
      return;
    }

    const parsedQuestions = parseBulkQuestions(bulkText);
    
    if (parsedQuestions.length === 0) {
      toast({ title: 'No valid questions found', description: 'Check the format and try again.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    try {
      const maxOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) : -1;
      
      const questionsToInsert = parsedQuestions.map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points,
        order_index: maxOrder + 1 + index,
      }));

      const { error } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert);

      if (error) throw error;

      toast({ title: `Imported ${parsedQuestions.length} questions` });
      setBulkText('');
      setShowBulkImport(false);
      fetchQuestions();
      onQuestionsUpdated?.();
    } catch (error: any) {
      toast({ title: 'Error importing questions', description: error.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const bulkImportExample = `What is the capital of France?
A) London
B) Paris *
C) Berlin
D) Madrid

The Earth is flat.
Type: true_false
Answer: False
Points: 2

What year did World War II end?
Type: short_answer
Answer: 1945`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Questions: {quiz.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Question Form */}
          {isEditing && (
            <Card className="border-primary">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{editingQuestion ? 'Edit Question' : 'New Question'}</h3>
                  <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Question Type</Label>
                      <Select value={formData.question_type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="short_answer">Short Answer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Points</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.points}
                        onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Question Text *</Label>
                    <Textarea
                      value={formData.question_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                      placeholder="Enter your question..."
                      rows={2}
                    />
                  </div>

                  {/* Multiple Choice Options */}
                  {formData.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      <Label>Options (click to mark correct)</Label>
                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant={formData.correct_answer === option && option ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => option && setFormData(prev => ({ ...prev, correct_answer: option }))}
                            disabled={!option}
                          >
                            {formData.correct_answer === option && option ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">{String.fromCharCode(65 + index)}</span>
                            )}
                          </Button>
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...formData.options];
                              newOptions[index] = e.target.value;
                              setFormData(prev => ({ 
                                ...prev, 
                                options: newOptions,
                                // Clear correct answer if it was this option
                                correct_answer: prev.correct_answer === option ? '' : prev.correct_answer
                              }));
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* True/False Options */}
                  {formData.question_type === 'true_false' && (
                    <div className="space-y-2">
                      <Label>Correct Answer</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.correct_answer === 'True' ? "default" : "outline"}
                          onClick={() => setFormData(prev => ({ ...prev, correct_answer: 'True' }))}
                          className="flex-1"
                        >
                          <Check className={`h-4 w-4 mr-2 ${formData.correct_answer === 'True' ? '' : 'opacity-0'}`} />
                          True
                        </Button>
                        <Button
                          type="button"
                          variant={formData.correct_answer === 'False' ? "default" : "outline"}
                          onClick={() => setFormData(prev => ({ ...prev, correct_answer: 'False' }))}
                          className="flex-1"
                        >
                          <Check className={`h-4 w-4 mr-2 ${formData.correct_answer === 'False' ? '' : 'opacity-0'}`} />
                          False
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Short Answer */}
                  {formData.question_type === 'short_answer' && (
                    <div>
                      <Label>Correct Answer *</Label>
                      <Input
                        value={typeof formData.correct_answer === 'string' ? formData.correct_answer : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                        placeholder="Enter the correct answer..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        User's answer must match exactly (case-insensitive)
                      </p>
                    </div>
                  )}

                  <Button onClick={handleSave} className="w-full">
                    {editingQuestion ? 'Update Question' : 'Add Question'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {!isEditing && !showBulkImport && (
            <div className="flex gap-2">
              <Button onClick={handleAddNew} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
              <Button variant="outline" onClick={() => setShowBulkImport(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </div>
          )}

          {/* Bulk Import Panel */}
          {showBulkImport && (
            <Card className="border-primary">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Bulk Import Questions
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => { setShowBulkImport(false); setBulkText(''); }}>
                    Cancel
                  </Button>
                </div>

                <div>
                  <Label>Paste your questions below</Label>
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={bulkImportExample}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="bg-muted/50 rounded-md p-3 text-xs space-y-2">
                  <p className="font-medium flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Format Guide:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Separate questions with blank lines</li>
                    <li>For multiple choice: use A) B) C) D) format, mark correct with *</li>
                    <li>Add "Type: true_false" or "Type: short_answer" for other types</li>
                    <li>Add "Answer: value" for the correct answer</li>
                    <li>Add "Points: 2" to set custom point values</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleBulkImport} 
                    disabled={isImporting || !bulkText.trim()}
                    className="flex-1"
                  >
                    {isImporting ? 'Importing...' : `Import Questions`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading questions...</p>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No questions yet.</p>
              <p className="text-sm">Add your first question to get started.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {questions.map((question, index) => (
                    <SortableQuestionItem
                      key={question.id}
                      question={question}
                      index={index}
                      onEdit={() => handleEdit(question)}
                      onDelete={() => handleDelete(question.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? 's' : ''} • 
            {questions.reduce((sum, q) => sum + q.points, 0)} total points
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
