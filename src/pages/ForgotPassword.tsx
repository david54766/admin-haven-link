import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import pandaLogo from '@/assets/classroom-panda-logo.png';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: data.email,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });

      if (error) throw error;

      setEmailSent(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      setEmailSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-10 left-10 w-40 h-40 bg-[hsl(330,70%,85%)] rounded-full blur-3xl opacity-40" />
        <div className="absolute top-40 right-10 w-48 h-48 bg-[hsl(280,55%,85%)] rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-[hsl(190,70%,85%)] rounded-full blur-3xl opacity-40" />
      </div>

      <div className="container py-8 px-4">
        <Button variant="ghost" asChild className="mb-6 text-[hsl(280,40%,40%)] hover:bg-[hsl(280,60%,95%)]">
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
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
                Reset Password
              </CardTitle>
              <CardDescription className="text-[hsl(280,15%,50%)]">
                {emailSent
                  ? 'Check your email for a reset link'
                  : 'Enter your email to receive a password reset link'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailSent ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(330,70%,95%)]">
                    <CheckCircle className="h-8 w-8 text-[hsl(330,70%,60%)]" />
                  </div>
                  <p className="text-sm text-[hsl(280,15%,50%)]">
                    If an account exists with that email, you'll receive a password reset link shortly. Please check your inbox and spam folder.
                  </p>
                  <Button variant="outline" asChild className="w-full border-[hsl(280,30%,85%)] text-[hsl(280,40%,40%)]">
                    <Link to="/login">Return to Login</Link>
                  </Button>
                </div>
              ) : (
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

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[hsl(330,70%,65%)] to-[hsl(280,55%,60%)] hover:from-[hsl(330,70%,58%)] hover:to-[hsl(280,55%,53%)] text-white shadow-lg shadow-[hsl(280,50%,60%)]/25 border-0"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Reset Link
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
