import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { HomeworkAssignment, HomeworkSubmission, Module, TrainingTrack } from '@/types/database';

interface HomeworkWithDetails extends HomeworkAssignment {
  module?: Module & { track?: TrainingTrack };
  submission?: HomeworkSubmission;
}

interface PendingHomeworkListProps {
  homework: HomeworkWithDetails[];
  isLoading: boolean;
}

export function PendingHomeworkList({ homework, isLoading }: PendingHomeworkListProps) {
  if (isLoading) {
    return <p className="text-muted-foreground">Loading homework...</p>;
  }

  if (homework.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-brand-green" />
        </div>
        <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
        <p className="text-muted-foreground">
          You don't have any pending homework assignments.
        </p>
      </div>
    );
  }

  const getStatusBadge = (submission?: HomeworkSubmission) => {
    if (!submission) {
      return (
        <Badge variant="outline" className="border-brand-yellow text-brand-gray">
          <Clock className="h-3 w-3 mr-1" />
          Not Started
        </Badge>
      );
    }
    
    switch (submission.reviewed_status) {
      case 'approved':
        return (
          <Badge className="bg-brand-green text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'needs_revision':
        return (
          <Badge className="bg-brand-red text-white">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Revision
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {homework.map((hw) => {
        const trackId = hw.module?.track?.id;
        const trackTitle = hw.module?.track?.title || 'Unknown Track';
        const moduleTitle = hw.module?.title || 'Unknown Module';
        
        return (
          <Card key={hw.id} className="border-2 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-red/10">
                    <FileText className="h-5 w-5 text-brand-red" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{hw.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {trackTitle} → {moduleTitle}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(hw.submission)}
              </div>
            </CardHeader>
            <CardContent>
              {hw.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {hw.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {hw.is_required && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                  {hw.due_days && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due within {hw.due_days} days
                    </span>
                  )}
                </div>
                {trackId && (
                  <Button asChild size="sm" className="gap-1">
                    <Link to={`/training/${trackId}/homework/${hw.id}`}>
                      {hw.submission ? 'View' : 'Start'}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
