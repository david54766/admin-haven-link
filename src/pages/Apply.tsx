import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { strongPasswordSchema, PASSWORD_REQUIREMENTS } from '@/lib/passwordValidation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import logo from '@/assets/logo.png';
import { ApplicationFormField } from '@/types/applicationForm';
import { useTenant } from '@/contexts/TenantContext';

export default function Apply() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fields, setFields] = useState<ApplicationFormField[]>([]);
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenantId } = useTenant();

  // Fetch dynamic form fields and centers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, centersRes] = await Promise.all([
          supabase
            .from('application_form_fields')
            .select('*')
            .eq('is_enabled', true)
            .order('order_index'),
          supabase
            .from('centers')
            .select('id, name')
            .order('name'),
        ]);

        if (fieldsRes.error) throw fieldsRes.error;
        
        setFields((fieldsRes.data || []).map(f => ({
          ...f,
          field_type: f.field_type as ApplicationFormField['field_type'],
          field_options: Array.isArray(f.field_options) 
            ? (f.field_options as unknown as string[]) 
            : [],
        })));
        setCenters(centersRes.data || []);
      } catch (error) {
        console.error('Error fetching form data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Build dynamic zod schema based on fields
  const formSchema = useMemo(() => {
    const schemaShape: Record<string, z.ZodTypeAny> = {
      // Always include password fields for account creation
      password: strongPasswordSchema,
      confirmPassword: z.string(),
    };

    fields.forEach(field => {
      let fieldSchema: z.ZodTypeAny;
      
      switch (field.field_type) {
        case 'email':
          fieldSchema = z.string().email('Please enter a valid email address').max(255);
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        default:
          fieldSchema = z.string().max(1000);
      }

      if (field.is_required) {
        if (field.field_type === 'checkbox') {
          fieldSchema = (fieldSchema as z.ZodBoolean).refine(val => val === true, { message: 'This field is required' });
        } else {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.field_label} is required`);
        }
      } else {
        if (field.field_type !== 'checkbox') {
          fieldSchema = (fieldSchema as z.ZodString).optional().or(z.literal(''));
        }
      }

      schemaShape[field.field_name] = fieldSchema;
    });

    return z.object(schemaShape).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
  }, [fields]);

  // Generate default values
  const defaultValues = useMemo(() => {
    const values: Record<string, string | boolean> = {
      password: '',
      confirmPassword: '',
    };
    
    fields.forEach(field => {
      values[field.field_name] = field.field_type === 'checkbox' ? false : '';
    });
    
    return values;
  }, [fields]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Reset form when fields load
  useEffect(() => {
    if (!isLoading && fields.length > 0) {
      form.reset(defaultValues);
    }
  }, [isLoading, fields, defaultValues, form]);

  const onSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);

    try {
      // Extract email and full name from dynamic fields
      const email = data.email;
      const fullName = data.fullName || data.full_name || data.name || 'Applicant';
      const phone = data.phone || null;
      const applicationMessage = data.applicationMessage || data.application_message || null;
      const centerId = data.center || data.centerId || data.center_id || null;

      if (!email) {
        throw new Error('Email is required');
      }

      // Sign up the user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            phone: phone,
            application_message: applicationMessage,
            tenant_id: tenantId,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Update the profile with additional data (trigger creates basic profile)
      const updateData: Record<string, any> = {
        full_name: fullName,
        phone: phone,
        application_message: applicationMessage,
      };
      if (centerId) {
        updateData.center_id = centerId;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', authData.user.id);

      if (profileError) {
        // Profile might not exist yet if trigger hasn't fired, ignore error
        console.log('Profile update note:', profileError.message);
      }

      // Send branded registration email to applicant + notification to admins
      try {
        const applicationData: Record<string, string> = {};
        fields.forEach(field => {
          const value = data[field.field_name];
          if (value !== undefined && value !== '' && field.field_name !== 'password' && field.field_name !== 'confirmPassword') {
            applicationData[field.field_label] = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
          }
        });

        // Send both emails in parallel
        await Promise.allSettled([
          supabase.functions.invoke('send-registration-email', {
            body: { applicantName: fullName, applicantEmail: email },
          }),
          supabase.functions.invoke('send-application-notification', {
            body: { applicationData, applicantName: fullName, applicantEmail: email },
          }),
        ]);
      } catch (emailError) {
        console.log('Email notification note:', emailError);
      }

      setIsSuccess(true);
      toast({
        title: 'Application Submitted',
        description: 'Please check your email to verify your account. An administrator will review your application.',
      });
    } catch (error: any) {
      console.error('Application error:', error);
      toast({
        title: 'Application Failed',
        description: error.message || 'There was an error submitting your application. Please try again.',
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
              Application Submitted!
            </CardTitle>
            <CardDescription className="text-base">
              Thank you for applying. Please check your email to verify your account. 
              An administrator will review your application and you'll be notified once approved.
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

  const renderField = (field: ApplicationFormField) => {
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.field_name}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.field_label}
              {field.is_required && ' *'}
            </FormLabel>
            <FormControl>
              {field.field_type === 'textarea' ? (
                <Textarea
                  placeholder={field.placeholder || ''}
                  className="min-h-[100px] border-2 focus-visible:ring-primary"
                  value={typeof formField.value === 'string' ? formField.value : ''}
                  onChange={formField.onChange}
                  onBlur={formField.onBlur}
                  name={formField.name}
                  ref={formField.ref}
                />
              ) : field.field_type === 'select' ? (
                <Select 
                  onValueChange={formField.onChange} 
                  defaultValue={typeof formField.value === 'string' ? formField.value : undefined}
                >
                  <SelectTrigger className="border-2 focus:ring-primary">
                    <SelectValue placeholder={field.placeholder || 'Select an option'} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.field_options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.field_type === 'center_select' ? (
                <Select 
                  onValueChange={formField.onChange} 
                  defaultValue={typeof formField.value === 'string' ? formField.value : undefined}
                >
                  <SelectTrigger className="border-2 focus:ring-primary">
                    <SelectValue placeholder={field.placeholder || 'Select a center'} />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.field_type === 'checkbox' ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={typeof formField.value === 'boolean' ? formField.value : false}
                    onCheckedChange={formField.onChange}
                  />
                  <span className="text-sm text-muted-foreground">{field.placeholder}</span>
                </div>
              ) : (
                <Input
                  type={field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
                  placeholder={field.placeholder || ''}
                  className="border-2 focus-visible:ring-primary"
                  value={typeof formField.value === 'string' ? formField.value : ''}
                  onChange={formField.onChange}
                  onBlur={formField.onBlur}
                  name={formField.name}
                  ref={formField.ref}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-40 h-40 bg-brand-yellow/20 rounded-full blur-3xl" />
        <div className="absolute top-60 right-10 w-48 h-48 bg-brand-purple/15 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/4 w-36 h-36 bg-brand-blue/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/3 w-32 h-32 bg-brand-red/15 rounded-full blur-3xl" />
      </div>

      <div className="container py-8">
        <Button variant="ghost" asChild className="mb-6 hover:bg-accent">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="mx-auto max-w-lg">
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center pb-2">
              <img src={logo} alt="Little Hands Early Learning Center" className="mx-auto h-20 w-auto mb-4" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/50 text-foreground mx-auto mb-2">
                <Sparkles className="h-3 w-3 text-brand-purple" />
                <span className="text-xs font-medium">Join Our Team</span>
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-brand-red via-brand-purple to-brand-blue bg-clip-text text-transparent">
                Staff Application
              </CardTitle>
              <CardDescription>
                Apply to join our childcare team. Your application will be reviewed by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Render dynamic fields */}
                    {fields.map(renderField)}

                    {/* Password fields (always shown) */}
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
                              value={typeof field.value === 'string' ? field.value : ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <PasswordRequirements password={typeof field.value === 'string' ? field.value : ''} />
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
                              value={typeof field.value === 'string' ? field.value : ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
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
                          Submitting...
                        </>
                      ) : (
                        'Submit Application'
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-secondary hover:text-secondary/80 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
