import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import pandaLogo from '@/assets/classroom-panda-logo.png';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const failedAttemptsRef = useRef<number[]>([]);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const isLockedOut = useCallback(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) return true;
    if (lockoutUntil && Date.now() >= lockoutUntil) {
      setLockoutUntil(null);
      setLockoutRemaining(0);
      failedAttemptsRef.current = [];
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    }
    return false;
  }, [lockoutUntil]);

  const startLockoutTimer = useCallback((until: number) => {
    if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    lockoutTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
        setLockoutUntil(null);
        failedAttemptsRef.current = [];
      }
    }, 1000);
  }, []);

  const recordFailedAttempt = useCallback(() => {
    const now = Date.now();
    failedAttemptsRef.current = failedAttemptsRef.current.filter(
      (t) => now - t < ATTEMPT_WINDOW_MS
    );
    failedAttemptsRef.current.push(now);

    if (failedAttemptsRef.current.length >= MAX_ATTEMPTS) {
      const until = now + LOCKOUT_DURATION_MS;
      setLockoutUntil(until);
      setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
      startLockoutTimer(until);
    }
  }, [startLockoutTimer]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (isLockedOut()) {
      toast({
        title: 'Account Temporarily Locked',
        description: `Too many failed attempts. Please wait ${lockoutRemaining} seconds.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      failedAttemptsRef.current = [];

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id);

      const roles = rolesData?.map((r: { role: string }) => r.role) || [];
      const isPlatformAdmin = roles.includes('platform_admin');
      const isAdmin = roles.includes('super_admin') || roles.includes('director') || roles.includes('admin');

      navigate(isPlatformAdmin ? '/platform' : isAdmin ? '/admin' : from, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      recordFailedAttempt();

      const recentAttempts = failedAttemptsRef.current.filter(
        (t) => Date.now() - t < ATTEMPT_WINDOW_MS
      ).length;
      const attemptsLeft = MAX_ATTEMPTS - recentAttempts;

      toast({
        title: 'Login Failed',
        description: attemptsLeft > 0
          ? `Invalid email or password. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`
          : 'Too many failed attempts. Your account has been temporarily locked.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Decorative background matching landing */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-10 left-10 w-40 h-40 bg-[hsl(330,70%,85%)] rounded-full blur-3xl opacity-40" />
        <div className="absolute top-40 right-10 w-48 h-48 bg-[hsl(280,55%,85%)] rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-[hsl(190,70%,85%)] rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-40 right-1/3 w-32 h-32 bg-[hsl(330,60%,85%)] rounded-full blur-3xl opacity-30" />
      </div>

      <div className="container py-8 px-4">
        <Button variant="ghost" asChild className="mb-6 text-[hsl(280,40%,40%)] hover:bg-[hsl(280,60%,95%)]">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="mx-auto max-w-md">
          <Card className="border border-[hsl(280,30%,90%)] shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto flex items-center gap-2.5 mb-4">
                <img src={pandaLogo} alt="Panda Staff Training" className="h-10 w-10" />
                <span className="text-xl font-bold bg-gradient-to-r from-[hsl(330,70%,65%)] to-[hsl(280,55%,60%)] bg-clip-text text-transparent">
                  Panda Staff Training
                </span>
              </div>
              <CardTitle className="text-2xl text-[hsl(280,30%,20%)]">
                Staff Login
              </CardTitle>
              <CardDescription className="text-[hsl(280,15%,50%)]">
                Sign in to access the training portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLockedOut() && (
                <Alert variant="destructive" className="mb-4">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Too many failed login attempts. Please wait {lockoutRemaining} seconds before trying again.
                  </AlertDescription>
                </Alert>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[hsl(280,30%,25%)]">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            className="border-[hsl(280,30%,85%)] focus-visible:ring-[hsl(280,55%,60%)]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[hsl(280,30%,25%)]">Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="border-[hsl(280,30%,85%)] focus-visible:ring-[hsl(280,55%,60%)]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[hsl(330,70%,65%)] to-[hsl(280,55%,60%)] hover:from-[hsl(330,70%,58%)] hover:to-[hsl(280,55%,53%)] text-white shadow-lg shadow-[hsl(280,50%,60%)]/25 border-0"
                    disabled={isSubmitting || isLockedOut()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-4 text-center">
                <Link to="/forgot-password" className="text-sm text-[hsl(280,15%,50%)] hover:text-[hsl(280,55%,55%)] hover:underline">
                  Forgot your password?
                </Link>
              </div>

              <p className="mt-4 text-center text-sm text-[hsl(280,15%,50%)]">
                Already a staff member?{' '}
                <Link to="/register" className="font-medium text-[hsl(280,55%,55%)] hover:text-[hsl(280,55%,45%)] hover:underline">
                  Staff Register
                </Link>
              </p>
              <p className="mt-2 text-center text-sm text-[hsl(280,15%,50%)]">
                New to childcare?{' '}
                <Link to="/apply" className="font-medium text-[hsl(330,70%,60%)] hover:text-[hsl(330,70%,50%)] hover:underline">
                  Apply to join
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
