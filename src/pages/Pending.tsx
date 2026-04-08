import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, Sparkles } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Pending() {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-40 h-40 bg-brand-yellow/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-brand-blue/15 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-brand-purple/15 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="text-center">
          <img src={logo} alt="Unique Kids Child Care Center" className="mx-auto h-16 w-auto mb-4" />
          <div className="mx-auto w-16 h-16 rounded-full bg-brand-yellow/20 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-brand-yellow" />
          </div>
          <CardTitle className="text-2xl bg-gradient-to-r from-brand-yellow to-brand-orange bg-clip-text text-transparent">
            Application Pending
          </CardTitle>
          <CardDescription className="text-base">
            Hi {profile?.full_name}, your application is currently under review.
            An administrator will approve your account soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 text-foreground">
            <Sparkles className="h-4 w-4 text-brand-purple" />
            <span className="text-sm">You'll receive an email notification once approved</span>
          </div>
          <div className="pt-4">
            <Button variant="outline" onClick={handleSignOut} className="border-2">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
