import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, LogOut, Mail } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Rejected() {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-40 h-40 bg-brand-orange/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-brand-blue/15 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="text-center">
          <img src={logo} alt="Unique Kids Child Care Center" className="mx-auto h-16 w-auto mb-4" />
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Application Not Approved
          </CardTitle>
          <CardDescription className="text-base">
            Hi {profile?.full_name}, unfortunately your application was not approved at this time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>Contact the administrator if you believe this was an error</span>
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
