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
import { Loader2, Plus, Building2, Users, Shield, Power, LogOut } from 'lucide-react';

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

      // Get user counts per tenant
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Platform Admin</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Tenants</CardDescription>
              <CardTitle className="text-3xl">{tenants.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-3xl text-primary">{tenants.filter(t => t.is_active).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">{tenants.reduce((sum, t) => sum + (t.user_count || 0), 0)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tenant Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Tenant Organizations
              </CardTitle>
              <CardDescription>Manage childcare organizations on the platform</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Tenant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Tenant</DialogTitle>
                  <DialogDescription>
                    Set up a new childcare organization. An admin account will be created and a welcome email sent.
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
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Tenant
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}