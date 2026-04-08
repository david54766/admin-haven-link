import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Calendar, Shield, Bell } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { profile, roles, isAdmin, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [updatingNotifs, setUpdatingNotifs] = useState(false);

  const handleToggleChecklistNotifs = async (checked: boolean) => {
    if (!profile) return;
    setUpdatingNotifs(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ checklist_email_notifications: checked })
        .eq('user_id', profile.user_id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: checked ? 'Notifications enabled' : 'Notifications disabled' });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      toast({ title: 'Failed to update preference', variant: 'destructive' });
    } finally {
      setUpdatingNotifs(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">View your account information.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-blue/10">
                  <User className="h-5 w-5 text-brand-blue" />
                </div>
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                <div className="p-2 rounded-full bg-brand-red/10">
                  <User className="h-4 w-4 text-brand-red" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="font-medium text-foreground">{profile?.full_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                <div className="p-2 rounded-full bg-brand-purple/10">
                  <Mail className="h-4 w-4 text-brand-purple" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{profile?.email}</p>
                </div>
              </div>

              {profile?.phone && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                  <div className="p-2 rounded-full bg-brand-green/10">
                    <Phone className="h-4 w-4 text-brand-green" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium text-foreground">{profile.phone}</p>
                  </div>
                </div>
              )}

              {profile?.center && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                  <div className="p-2 rounded-full bg-brand-yellow/20">
                    <MapPin className="h-4 w-4 text-brand-gray" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Center</p>
                    <p className="font-medium text-foreground">{profile.center.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                <div className="p-2 rounded-full bg-brand-orange/20">
                  <Calendar className="h-4 w-4 text-brand-gray" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="font-medium text-foreground">
                    {profile?.created_at
                      ? format(new Date(profile.created_at), 'MMMM d, yyyy')
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-purple/10">
                    <Shield className="h-5 w-5 text-brand-purple" />
                  </div>
                  <div>
                    <CardTitle>Account Status</CardTitle>
                    <CardDescription>Your roles and permissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-accent/30">
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <Badge
                    variant={profile?.status === 'approved' ? 'default' : 'secondary'}
                    className={`capitalize text-sm px-3 py-1 ${
                      profile?.status === 'approved' 
                        ? 'bg-brand-green text-white' 
                        : profile?.status === 'pending'
                        ? 'bg-brand-yellow text-brand-gray'
                        : ''
                    }`}
                  >
                    {profile?.status}
                  </Badge>
                </div>

                <div className="p-4 rounded-lg bg-accent/30">
                  <p className="text-sm text-muted-foreground mb-2">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.length === 0 ? (
                      <Badge variant="outline" className="border-2 capitalize">Staff</Badge>
                    ) : (
                      roles.map((role) => (
                        <Badge 
                          key={role} 
                          variant="outline" 
                          className="border-2 capitalize bg-gradient-to-r from-brand-red/10 to-brand-purple/10"
                        >
                          {role.replace('_', ' ')}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-blue/10">
                      <Bell className="h-5 w-5 text-brand-blue" />
                    </div>
                    <div>
                      <CardTitle>Notification Preferences</CardTitle>
                      <CardDescription>Manage your email notifications</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-accent/30">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Checklist Submissions</Label>
                      <p className="text-xs text-muted-foreground">
                        Receive emails when staff submit checklists
                      </p>
                    </div>
                    <Switch
                      checked={profile?.checklist_email_notifications ?? true}
                      onCheckedChange={handleToggleChecklistNotifs}
                      disabled={updatingNotifs}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
