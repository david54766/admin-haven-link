import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Building2, Users, Shield, Power, LogOut, Mail, Calendar } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  is_active: boolean;
  contact_email: string | null;
  contact_name: string | null;
  suspended_at: string | null;
  max_users: number | null;
  created_at: string;
  user_count?: number;
}

export default function PlatformDashboard() {
  const { signOut } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    tenant_name: '',
    slug: '',
    contact_name: '',
    contact_email: '',
    admin_password: '',
  });

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('tenant_id');

      const countMap: Record<string, number> = {};
      (profiles || []).forEach((p: any) => {
        countMap[p.tenant_id] = (countMap[p.tenant_id] || 0) + 1;
      });

      const tenantsWithCounts = (data || []).map((t: any) => ({
        ...t,
        user_count: countMap[t.id] || 0,
      }));

      setTenants(tenantsWithCounts);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreate = async () => {
    if (!form.tenant_name || !form.slug || !form.contact_email || !form.admin_password) {
      toast({ title: 'Missing fields', description: 'All fields are required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('create-tenant-account', {
        body: {
          tenant_name: form.tenant_name,
          slug: form.slug,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          admin_password: form.admin_password,
        },
      });

      if (response.error) throw new Error(response.error.message);

      toast({ title: 'Tenant created', description: `${form.tenant_name} has been created and a welcome email sent.` });
      setForm({ tenant_name: '', slug: '', contact_name: '', contact_email: '', admin_password: '' });
      setDialogOpen(false);
      fetchTenants();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleTenant = async (tenant: Tenant) => {
    try {
      const newActive = !tenant.is_active;
      const { error } = await supabase
        .from('tenants')
        .update({
          is_active: newActive,
          suspended_at: newActive ? null : new Date().toISOString(),
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast({ title: newActive ? 'Activated' : 'Suspended', description: `${tenant.name} has been ${newActive ? 'activated' : 'suspended'}.` });
      fetchTenants();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const autoSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const CreateTenantDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">New Tenant</span>
          <span className="sm:hidden">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>
            Set up a new childcare organization. An admin account will be created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input
              placeholder="Sunshine Childcare"
              value={form.tenant_name}
              onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value, slug: autoSlug(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              placeholder="sunshine-childcare"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Admin Contact Name</Label>
            <Input
              placeholder="Jane Smith"
              value={form.contact_name}
              onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Admin Email</Label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Admin Password</Label>
            <Input
              type="password"
              placeholder="Temporary password"
              value={form.admin_password}
              onChange={e => setForm(f => ({ ...f, admin_password: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleCreate} disabled={creating} className="w-full sm:w-auto">
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Tenant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container px-4 flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <h1 className="text-base sm:text-lg font-bold text-foreground">Platform Admin</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
              <CardDescription className="text-xs sm:text-sm">Tenants</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{tenants.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
              <CardDescription className="text-xs sm:text-sm">Active</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-primary">{tenants.filter(t => t.is_active).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
              <CardDescription className="text-xs sm:text-sm">Users</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{tenants.reduce((sum, t) => sum + (t.user_count || 0), 0)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tenant Management */}
        <Card>
          <CardHeader className="p-4 sm:p-6 flex flex-row items-start sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate">Organizations</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">Manage childcare organizations</CardDescription>
            </div>
            {CreateTenantDialog}
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {/* Mobile card layout */}
            <div className="space-y-3 md:hidden">
              {tenants.map(tenant => (
                <Card key={tenant.id} className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                      </div>
                      <Badge variant={tenant.is_active ? 'default' : 'destructive'} className="shrink-0">
                        {tenant.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {tenant.contact_name && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{tenant.contact_name}</span>
                        </div>
                      )}
                      {tenant.contact_email && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{tenant.contact_email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{tenant.user_count || 0} users</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{new Date(tenant.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Button
                      variant={tenant.is_active ? 'outline' : 'default'}
                      size="sm"
                      className="w-full"
                      onClick={() => toggleTenant(tenant)}
                    >
                      <Power className="h-4 w-4 mr-1" />
                      {tenant.is_active ? 'Suspend' : 'Activate'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {tenants.length === 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No tenants yet. Create the first one above.
                </p>
              )}
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map(tenant => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{tenant.contact_name || '—'}</p>
                          <p className="text-sm text-muted-foreground">{tenant.contact_email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{tenant.user_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.is_active ? 'default' : 'destructive'}>
                          {tenant.is_active ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={tenant.is_active ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => toggleTenant(tenant)}
                        >
                          <Power className="h-4 w-4 mr-1" />
                          {tenant.is_active ? 'Suspend' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No tenants yet. Create the first one above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
