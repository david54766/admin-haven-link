import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { strongPasswordSchema } from '@/lib/passwordValidation';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import logo from '@/assets/logo.png';

const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;



export default function ResetPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      // Check for token_hash in URL query params (from our custom reset email)
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type = params.get('type');

      if (tokenHash && type === 'recovery') {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (!error) {
            setIsValidSession(true);
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch (e) {
          console.error('Token verification error:', e);
        }
        setIsChecking(false);
        return;
      }

      // Fallback: listen for PASSWORD_RECOVERY event (from default Supabase flow)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true);
          setIsChecking(false);
        }
      });

      // Also check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      }
      setIsChecking(false);

      return () => subscription.unsubscribe();
    };

    verifyToken();
  }, []);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      setResetComplete(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully reset.',
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-40 h-40 bg-brand-yellow/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-brand-blue/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-brand-purple/15 rounded-full blur-3xl" />
      </div>

      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6 hover:bg-accent">
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </Button>

        <div className="mx-auto max-w-md">
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center pb-2">
              <img src={logo} alt="Logo" className="mx-auto h-20 w-auto mb-4" />
              <CardTitle className="text-2xl bg-gradient-to-r from-brand-red via-brand-purple to-brand-blue bg-clip-text text-transparent">
                {resetComplete ? 'Password Reset!' : 'Set New Password'}
              </CardTitle>
              <CardDescription>
                {resetComplete
                  ? 'Your password has been updated successfully'
                  : !isValidSession
                    ? 'This reset link is invalid or has expired'
                    : 'Enter your new password below'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetComplete ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You can now sign in with your new password.
                  </p>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link to="/login">Go to Login</Link>
                  </Button>
                </div>
              ) : !isValidSession ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Please request a new password reset link.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/forgot-password">Request New Link</Link>
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              className="border-2 focus-visible:ring-primary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <PasswordRequirements password={field.value} />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
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
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
