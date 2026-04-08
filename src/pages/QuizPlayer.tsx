import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Quiz, QuizQuestion, QuizAttempt } from '@/types/database';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface QuizQuestionWithAnswer extends QuizQuestion {
  userAnswer?: string | string[];
}

export default function QuizPlayerPage() {
  const { trackId, quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionWithAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; passed: boolean } | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);
  const [serverCorrectMap, setServerCorrectMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (quizId && user) {
      fetchQuizData();
    }
  }, [quizId, user]);

  const fetchQuizData = async () => {
    try {
      const [quizRes, questionsRes, attemptsRes] = await Promise.all([
        supabase.from('quizzes').select('*').eq('id', quizId).single(),
        supabase.rpc('get_quiz_questions_safe', { p_quiz_id: quizId }),
        supabase.from('quiz_attempts').select('*').eq('quiz_id', quizId).eq('user_id', user!.id).order('started_at', { ascending: false }),
      ]);

      if (quizRes.error) throw quizRes.error;
      setQuiz(quizRes.data as Quiz);
      setQuestions((questionsRes.data || []) as QuizQuestionWithAnswer[]);
      setPreviousAttempts((attemptsRes.data || []) as QuizAttempt[]);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const handleSingleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleAnswer = (questionId: string, value: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, value] };
      } else {
        return { ...prev, [questionId]: current.filter((v) => v !== value) };
      }
    });
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index);
    }
  };

  const calculateScore = (): { score: number; maxScore: number } => {
    let score = 0;
    let maxScore = 0;

    questions.forEach((question) => {
      maxScore += question.points;
      const userAnswer = answers[question.id];
      const correctAnswer = question.correct_answer;

      if (!userAnswer) return;

      // Handle multiple correct answers
      if (Array.isArray(correctAnswer)) {
        if (Array.isArray(userAnswer)) {
          const sortedUser = [...userAnswer].sort();
          const sortedCorrect = [...correctAnswer].sort();
          if (JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect)) {
            score += question.points;
          }
        }
      } else if (question.question_type === 'short_answer') {
        // Case-insensitive comparison for short answers
        if (typeof userAnswer === 'string' && typeof correctAnswer === 'string' &&
            userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          score += question.points;
        }
      } else {
        // Single answer comparison
        if (userAnswer === correctAnswer) {
          score += question.points;
        }
      }
    });

    return { score, maxScore };
  };

  const handleSubmit = async () => {
    if (!user || !quiz) return;

    setIsSubmitting(true);
    try {
      // Convert answers to jsonb-compatible format with question IDs as keys
      const answersPayload: Record<string, any> = {};
      for (const [questionId, answer] of Object.entries(answers)) {
        answersPayload[questionId] = answer;
      }

      // Grade server-side to avoid relying on client-side correct_answer (which is NULL for non-admins)
      const { data: gradeResult, error: gradeError } = await supabase.rpc('grade_quiz_attempt', {
        p_quiz_id: quiz.id,
        p_answers: answersPayload,
      });

      if (gradeError) throw gradeError;

      const gradeData = gradeResult as any;
      const score = gradeData.score as number;
      const maxScore = gradeData.max_score as number;
      const passed = gradeData.passed as boolean;
      const percentScore = gradeData.percent as number;

      // Build correct answer map from server results for review display
      const serverResults = gradeData.results as Array<{ question_id: string; correct: boolean; correct_answer: any }>;
      const correctedQuestions = questions.map((q) => {
        const sr = serverResults.find((r) => r.question_id === q.id);
        return sr ? { ...q, correct_answer: sr.correct_answer } : q;
      });
      setQuestions(correctedQuestions);

      // Store the per-question correctness for review
      const correctMap: Record<string, boolean> = {};
      serverResults.forEach((r) => { correctMap[r.question_id] = r.correct; });
      setServerCorrectMap(correctMap);

      const { error } = await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quiz.id,
        answers: answersPayload,
        score,
        max_score: maxScore,
        passed,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      setResult({ score, maxScore, passed });
      setQuizCompleted(true);

      toast({
        title: passed ? 'Quiz Passed!' : 'Quiz Not Passed',
        description: `You scored ${score}/${maxScore} (${Math.round(percentScore)}%)`,
        variant: passed ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit quiz',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizCompleted(false);
    setResult(null);
  };

  const isCorrectAnswer = (questionId: string): boolean | null => {
    if (!quizCompleted) return null;
    if (Object.keys(serverCorrectMap).length > 0) {
      return serverCorrectMap[questionId] ?? false;
    }
    return null;
  };

  const canRetry = (): boolean => {
    if (!quiz) return false;
    if (!quiz.max_attempts) return true;
    return previousAttempts.length < quiz.max_attempts;
  };

  const hasPassed = previousAttempts.some((a) => a.passed);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </Layout>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Quiz not found or has no questions</p>
            <Button asChild className="mt-4">
              <Link to={`/training/${trackId}`}>Back to Track</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  // Results view
  if (quizCompleted && result) {
    const percentScore = result.maxScore > 0 ? (result.score / result.maxScore) * 100 : 0;

    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/training/${trackId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
              <p className="text-muted-foreground">Quiz Results</p>
            </div>
          </div>

          {/* Result Card */}
          <Card className={`border-2 ${result.passed ? 'border-brand-green bg-brand-green/5' : 'border-destructive bg-destructive/5'}`}>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                {result.passed ? (
                  <Trophy className="h-16 w-16 mx-auto text-brand-green" />
                ) : (
                  <XCircle className="h-16 w-16 mx-auto text-destructive" />
                )}
                <div>
                  <h2 className="text-2xl font-bold">
                    {result.passed ? 'Congratulations!' : 'Keep Trying!'}
                  </h2>
                  <p className="text-muted-foreground">
                    {result.passed
                      ? 'You have successfully passed this quiz.'
                      : `You need ${quiz.passing_score}% to pass. You can try again.`}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div>
                    <p className="text-4xl font-bold">{result.score}/{result.maxScore}</p>
                    <p className="text-sm text-muted-foreground">Points</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold">{Math.round(percentScore)}%</p>
                    <p className="text-sm text-muted-foreground">Score</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-center gap-4">
              {!result.passed && canRetry() && (
                <Button onClick={handleRetry} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
              <Button asChild>
                <Link to={`/training/${trackId}`}>Back to Track</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Question Review */}
          <Card>
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
              <CardDescription>Review your answers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((question, index) => {
                const correct = isCorrectAnswer(question.id);
                const userAnswer = answers[question.id];
                const options = question.options as string[] | null;

                return (
                  <div
                    key={question.id}
                    className={`p-4 rounded-lg border-2 ${
                      correct === true
                        ? 'border-brand-green bg-brand-green/5'
                        : correct === false
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{question.question_text}</p>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-muted-foreground">Your answer: </span>
                            <span className={correct ? 'text-brand-green' : 'text-destructive'}>
                              {Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer || 'Not answered'}
                            </span>
                          </p>
                          {!correct && (
                            <p>
                              <span className="text-muted-foreground">Correct answer: </span>
                              <span className="text-brand-green">
                                {Array.isArray(question.correct_answer)
                                  ? question.correct_answer.join(', ')
                                  : question.correct_answer}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      {correct ? (
                        <CheckCircle className="h-5 w-5 text-brand-green shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Quiz taking view
  const options = currentQuestion?.options as string[] | null;
  const isMultipleChoice = Array.isArray(currentQuestion?.correct_answer);
  const isShortAnswer = currentQuestion?.question_type === 'short_answer';

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/training/${trackId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
              {hasPassed && (
                <Badge variant="secondary" className="bg-brand-green/20 text-brand-green">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Passed
                </Badge>
              )}
            </div>
            {quiz.description && (
              <p className="text-muted-foreground">{quiz.description}</p>
            )}
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Progress: {answeredCount}/{totalQuestions} answered</span>
              <span>Pass: {quiz.passing_score}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">Question {currentQuestionIndex + 1} of {totalQuestions}</Badge>
              <Badge variant="secondary">{currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}</Badge>
            </div>
            <CardTitle className="text-lg mt-4">{currentQuestion.question_text}</CardTitle>
            {isMultipleChoice && (
              <CardDescription>Select all that apply</CardDescription>
            )}
            {isShortAnswer && (
              <CardDescription>Type your answer below</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isShortAnswer ? (
              <div className="space-y-2">
                <Input
                  placeholder="Type your answer here..."
                  value={(answers[currentQuestion.id] as string) || ''}
                  onChange={(e) => handleSingleAnswer(currentQuestion.id, e.target.value)}
                  className="w-full"
                />
              </div>
            ) : options && options.length > 0 && (
              isMultipleChoice ? (
                <div className="space-y-3">
                  {options.map((option, index) => {
                    const currentAnswers = (answers[currentQuestion.id] as string[]) || [];
                    const isChecked = currentAnswers.includes(option);

                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                          isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleMultipleAnswer(currentQuestion.id, option, !isChecked)}
                      >
                        <Checkbox
                          id={`option-${index}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleMultipleAnswer(currentQuestion.id, option, checked as boolean)
                          }
                        />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={(answers[currentQuestion.id] as string) || ''}
                  onValueChange={(value) => handleSingleAnswer(currentQuestion.id, value)}
                  className="space-y-3"
                >
                  {options.map((option, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                        answers[currentQuestion.id] === option
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSingleAnswer(currentQuestion.id, option)}
                    >
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <div className="flex gap-2">
              {currentQuestionIndex === totalQuestions - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || answeredCount < totalQuestions}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                </Button>
              ) : (
                <Button onClick={() => goToQuestion(currentQuestionIndex + 1)}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        {/* Question Navigator */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-3">Jump to question:</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, index) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = index === currentQuestionIndex;

                return (
                  <Button
                    key={q.id}
                    variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                    size="sm"
                    className="w-10 h-10"
                    onClick={() => goToQuestion(index)}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}