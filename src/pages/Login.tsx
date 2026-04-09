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
import logo from '@/assets/logo.png';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minute window

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
    defaultValues: {
      email: '',
      password: '',
    },
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

      if (error) {
        throw error;
      }

      // Reset attempts on success
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-40 h-40 bg-brand-yellow/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-brand-blue/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-brand-purple/15 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/3 w-32 h-32 bg-brand-red/15 rounded-full blur-3xl" />
      </div>

      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6 hover:bg-accent">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="mx-auto max-w-md">
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center pb-2">
              <img src={logo} alt="Unique Kids Child Care Center" className="mx-auto h-20 w-auto mb-4" />
              <CardTitle className="text-2xl bg-gradient-to-r from-brand-red via-brand-purple to-brand-blue bg-clip-text text-transparent">
                Staff Login
              </CardTitle>
              <CardDescription>
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
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john@example.com" 
                            className="border-2 focus-visible:ring-primary"
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="border-2 focus-visible:ring-primary"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" 
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
                <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already a staff member?{' '}
                <Link to="/register" className="font-medium text-primary hover:text-primary/80 hover:underline">
                  Staff Register
                </Link>
              </p>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                New to childcare?{' '}
                <Link to="/apply" className="font-medium text-secondary hover:text-secondary/80 hover:underline">
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
