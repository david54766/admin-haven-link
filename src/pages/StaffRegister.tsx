import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { strongPasswordSchema, PASSWORD_REQUIREMENTS } from '@/lib/passwordValidation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle, Users } from 'lucide-react';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import logo from '@/assets/logo.png';


const registrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address').max(255),
  position: z.string().min(1, 'Please select your position'),
  centerId: z.string().optional(),
  password: strongPasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function StaffRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const [centersRes, positionsRes] = await Promise.all([
        supabase.from('centers').select('id, name').order('name'),
        supabase.from('positions').select('name').eq('is_active', true).order('order_index'),
      ]);
      setCenters(centersRes.data || []);
      setPositions((positionsRes.data || []).map((p: any) => p.name));
    };
    fetchData();
  }, []);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      position: '',
      centerId: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);

    try {
      // Sign up the user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: data.fullName,
            position: data.position,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Update the profile with position and center
      const updateData: Record<string, any> = {
        full_name: data.fullName,
        position: data.position,
      };
      if (data.centerId) {
        updateData.center_id = data.centerId;
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.log('Profile update note:', profileError.message);
      }

      // Send registration confirmation and admin notification emails
      await Promise.allSettled([
        supabase.functions.invoke('send-registration-email', {
          body: { applicantName: data.fullName, applicantEmail: data.email },
        }),
        supabase.functions.invoke('send-application-notification', {
          body: {
            applicationData: {
              'Full Name': data.fullName,
              'Email': data.email,
              'Position': data.position,
              ...(data.centerId ? { 'Center': centers.find(c => c.id === data.centerId)?.name || data.centerId } : {}),
            },
            applicantName: data.fullName,
            applicantEmail: data.email,
          },
        }),
      ]);

      setIsSuccess(true);
      toast({
        title: 'Registration Submitted',
        description: 'Please check your email to verify your account. An administrator will approve your access.',
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'There was an error with your registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-40 h-40 bg-brand-green/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-brand-blue/20 rounded-full blur-3xl" />
        </div>
        
        <Card className="w-full max-w-md border-2 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-brand-green" />
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-brand-green to-brand-blue bg-clip-text text-transparent">
              Registration Complete!
            </CardTitle>
            <CardDescription className="text-base">
              Please check your email to verify your account. 
              An administrator will approve your access shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
              <Link to="/">Return to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-40 h-40 bg-brand-blue/20 rounded-full blur-3xl" />
        <div className="absolute top-60 right-10 w-48 h-48 bg-brand-purple/15 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/4 w-36 h-36 bg-brand-green/20 rounded-full blur-3xl" />
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
              <img src={logo} alt="Little Hands Early Learning Center" className="mx-auto h-20 w-auto mb-4" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50 text-foreground mx-auto mb-2">
                <Users className="h-3 w-3 text-brand-blue" />
                <span className="text-xs font-medium">Existing Staff</span>
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent">
                Staff Registration
              </CardTitle>
              <CardDescription>
                Quick registration for current staff members to access the training portal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Smith" 
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john@littlehands.com" 
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
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-2 focus:ring-primary">
                              <SelectValue placeholder="Select your position" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {positions.map((position) => (
                              <SelectItem key={position} value={position}>
                                {position}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {centers.length > 0 && (
                    <FormField
                      control={form.control}
                      name="centerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Center</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-2 focus:ring-primary">
                                <SelectValue placeholder="Select your center" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {centers.map((center) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {center.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="border-2 focus-visible:ring-primary"
                            {...field} 
                          />
                        </FormControl>
                        <PasswordRequirements password={field.value} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password *</FormLabel>
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
                        Registering...
                      </>
                    ) : (
                      'Register'
                    )}
                  </Button>
                </form>
              </Form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-secondary hover:text-secondary/80 hover:underline">
                  Sign in
                </Link>
              </p>
              
              <p className="mt-2 text-center text-sm text-muted-foreground">
                New applicant?{' '}
                <Link to="/apply" className="font-medium text-secondary hover:text-secondary/80 hover:underline">
                  Apply here
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
