import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserX, Mail } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function Disabled() {
  const { user, profile, signOut, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.status !== 'disabled') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <UserX className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Account Disabled</CardTitle>
          <CardDescription className="text-base">
            Your account has been temporarily disabled by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Your training progress, certificates, and hours have been preserved. 
              Please contact an administrator if you believe this was done in error 
              or if you need your access restored.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" asChild>
              <a href="mailto:admin@example.com">
                <Mail className="mr-2 h-4 w-4" />
                Contact Administrator
              </a>
            </Button>
            <Button variant="ghost" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
