import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { QuizAttempt } from '@/types/database';
import { format } from 'date-fns';

interface ProgressStatsProps {
  completedVideos: number;
  passedQuizzes: number;
  failedQuizzes: number;
  quizAttempts: QuizAttempt[];
}

export function ProgressStats({ completedVideos, passedQuizzes, failedQuizzes, quizAttempts }: ProgressStatsProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-brand-green/30 bg-brand-green/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Completed</CardTitle>
            <div className="p-2 rounded-lg bg-brand-green/10">
              <CheckCircle className="h-4 w-4 text-brand-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedVideos}</div>
            <p className="text-xs text-muted-foreground">Training videos watched</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-brand-blue/30 bg-brand-blue/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Passed</CardTitle>
            <div className="p-2 rounded-lg bg-brand-blue/10">
              <CheckCircle className="h-4 w-4 text-brand-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{passedQuizzes}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-brand-orange/30 bg-brand-orange/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes to Retry</CardTitle>
            <div className="p-2 rounded-lg bg-brand-orange/20">
              <XCircle className="h-4 w-4 text-brand-gray" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{failedQuizzes}</div>
            <p className="text-xs text-muted-foreground">Need another attempt</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quiz Attempts */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-purple/10">
              <TrendingUp className="h-5 w-5 text-brand-purple" />
            </div>
            <div>
              <CardTitle>Recent Quiz Attempts</CardTitle>
              <CardDescription>Your last 10 quiz attempts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {quizAttempts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quiz attempts yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizAttempts.slice(0, 10).map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-xl border-2 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    {attempt.passed ? (
                      <div className="p-2 rounded-full bg-brand-green/10">
                        <CheckCircle className="h-5 w-5 text-brand-green" />
                      </div>
                    ) : attempt.completed_at ? (
                      <div className="p-2 rounded-full bg-destructive/10">
                        <XCircle className="h-5 w-5 text-destructive" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-brand-yellow/20">
                        <Clock className="h-5 w-5 text-brand-gray" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">
                        {(attempt.quiz as any)?.title || 'Quiz'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(attempt.started_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {attempt.score}/{attempt.max_score}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((attempt.score / attempt.max_score) * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
