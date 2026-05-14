import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Search, Check, X, UserPlus, Shield, UserX, UserCheck, BookOpen, Loader2, Trash2 } from 'lucide-react';
import { Profile, Center, AppRole, TrainingTrack, StaffTrackAssignment } from '@/types/database';
import { format } from 'date-fns';

export default function AdminUsers() {
  const { user, isSuperAdmin, isDirector, roles, profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<Profile[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [tracks, setTracks] = useState<TrainingTrack[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, AppRole[]>>({});
  const [userTrackAssignments, setUserTrackAssignments] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  // Directors are scoped to their assigned center
  const directorCenterId = !isSuperAdmin && profile?.center_id ? profile.center_id : null;
  const [centerFilter, setCenterFilter] = useState(directorCenterId || 'all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create account form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [newCenterId, setNewCenterId] = useState('');
  const [newPosition, setNewPosition] = useState('');
  // Edit form state
  const [editStatus, setEditStatus] = useState<string>('');
  const [editCenterId, setEditCenterId] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('');
  const [editPosition, setEditPosition] = useState<string>('');
  const [editTrackIds, setEditTrackIds] = useState<string[]>([]);
  const [editHireDate, setEditHireDate] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    fetchCenters();
    fetchTracks();
    fetchPositions();
  }, []);

  // Keep center filter in sync when profile loads
  useEffect(() => {
    if (directorCenterId) {
      setCenterFilter(directorCenterId);
    }
  }, [directorCenterId]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setStatusFilter(status);
    }
  }, [searchParams]);

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*, center:centers(*)')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch roles for all users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const rolesMap: Record<string, AppRole[]> = {};
      for (const role of rolesData || []) {
        if (!rolesMap[role.user_id]) {
          rolesMap[role.user_id] = [];
        }
        rolesMap[role.user_id].push(role.role as AppRole);
      }

      // Hide platform admins from the tenant users list
      const filteredUsers = (usersData || []).filter(
        (u: any) => !(rolesMap[u.user_id] || []).includes('platform_admin')
      );
      setUsers(filteredUsers as Profile[]);
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      const { data, error } = await supabase.from('centers').select('*').order('name');
      if (error) throw error;
      setCenters((data || []) as Center[]);
    } catch (error) {
      console.error('Error fetching centers:', error);
    }
  };

  const fetchTracks = async () => {
    try {
      const { data: tracksData, error: tracksError } = await supabase
        .from('training_tracks')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (tracksError) throw tracksError;
      setTracks((tracksData || []) as TrainingTrack[]);

      // Fetch all track assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('staff_track_assignments')
        .select('*');

      if (assignmentsError) throw assignmentsError;

      const assignmentsMap: Record<string, string[]> = {};
      for (const assignment of assignmentsData || []) {
        if (!assignmentsMap[assignment.user_id]) {
          assignmentsMap[assignment.user_id] = [];
        }
        assignmentsMap[assignment.user_id].push(assignment.track_id);
      }
      setUserTrackAssignments(assignmentsMap);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('id, name')
        .eq('is_active', true)
        .order('order_index');
      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const handleEditUser = (userProfile: Profile) => {
    const targetUserRoles = userRoles[userProfile.user_id] || [];
    const isTargetSuperAdmin = targetUserRoles.includes('super_admin');
    
    // Directors cannot edit super admins
    if (isDirector && isTargetSuperAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Directors cannot edit Super Admin users.',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedUser(userProfile);
    setEditStatus(userProfile.status);
    setEditCenterId(userProfile.center_id || '');
    setEditRole(targetUserRoles[0] || 'staff');
    setEditPosition(userProfile.position || '');
    setEditTrackIds(userTrackAssignments[userProfile.user_id] || []);
    setEditHireDate((userProfile as any).hire_date || '');
    setIsDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          status: editStatus as 'pending' | 'approved' | 'rejected',
          center_id: editCenterId || null,
          position: editPosition || null,
          hire_date: editHireDate || null,
        } as any)
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Update role - use upsert to avoid delete/insert race condition
      // Block self-role change to prevent admins from locking themselves out
      const isSelf = selectedUser.user_id === user?.id;
      if (isSelf) {
        // skip role mutations entirely
      } else if (editRole) {
        // First, delete any existing roles for this user that aren't the new role
        const { error: deleteOldRolesError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.user_id)
          .neq('role', editRole as any);

        if (deleteOldRolesError) console.error('Error removing old roles:', deleteOldRolesError);

        // Then upsert the new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: selectedUser.user_id,
            role: editRole,
          } as any, { onConflict: 'user_id,role' });

        if (roleError) throw roleError;
      } else {
        // If no role selected, delete all roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.user_id);
      }

      // Update track assignments
      const currentAssignments = userTrackAssignments[selectedUser.user_id] || [];
      const toAdd = editTrackIds.filter(id => !currentAssignments.includes(id));
      const toRemove = currentAssignments.filter(id => !editTrackIds.includes(id));

      // Remove unselected tracks
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('staff_track_assignments')
          .delete()
          .eq('user_id', selectedUser.user_id)
          .in('track_id', toRemove);

        if (removeError) throw removeError;
      }

      // Add new tracks
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('staff_track_assignments')
          .insert(
            toAdd.map(trackId => ({
              user_id: selectedUser.user_id,
              track_id: trackId,
              assigned_by: user?.id || null,
            }))
          );

        if (addError) throw addError;
      }

      toast({ title: 'User Updated', description: 'User information has been updated.' });
      setIsDialogOpen(false);
      fetchUsers();
      fetchTracks(); // Refresh track assignments
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update user.',
        variant: 'destructive',
      });
    }
  };

  const handleTrackToggle = (trackId: string, checked: boolean) => {
    if (checked) {
      setEditTrackIds(prev => [...prev, trackId]);
    } else {
      setEditTrackIds(prev => prev.filter(id => id !== trackId));
    }
  };

  const handleQuickApprove = async (user: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', user.id);

      if (error) throw error;

      // Add default staff role if no role exists
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.user_id,
          role: 'staff',
        } as any, { onConflict: 'user_id,role' });

      if (roleError) console.error('Role error:', roleError);

      // Send approval email
      try {
        await supabase.functions.invoke('send-approval-email', {
          body: { email: user.email, fullName: user.full_name },
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      toast({ title: 'User Approved' });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve user.',
        variant: 'destructive',
      });
    }
  };

  const handleQuickReject = async (user: Profile) => {
    if (!confirm('Are you sure you want to reject this user?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'User Rejected' });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject user.',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesCenter = centerFilter === 'all' || user.center_id === centerFilter;
    const matchesPosition = positionFilter === 'all' || (positionFilter === 'none' ? !user.position : user.position === positionFilter);
    return matchesSearch && matchesStatus && matchesCenter && matchesPosition;
  });

  const handleToggleDisable = async (user: Profile) => {
    const isCurrentlyInactive = user.status === 'disabled' || user.status === 'inactive';
    const newStatus = isCurrentlyInactive ? 'approved' : 'inactive';
    const action = isCurrentlyInactive ? 'enable' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this user? ${action === 'deactivate' ? 'They will lose access to training content but their historical records will be preserved.' : 'They will regain access to training content.'}`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus as any })
        .eq('id', user.id);

      if (error) throw error;

      toast({ 
        title: isCurrentlyInactive ? 'User Enabled' : 'User Deactivated',
        description: isCurrentlyInactive 
          ? 'User now has access to training content.'
          : 'User access has been deactivated. Historical records are preserved.'
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} user.`,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending Approval</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'disabled':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Disabled</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateAccount = async () => {
    if (!newEmail || !newPassword || !newFullName) {
      toast({ title: 'Missing Fields', description: 'Email, password, and full name are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-user-account', {
        body: {
          email: newEmail,
          password: newPassword,
          full_name: newFullName,
          role: newRole,
          center_id: newCenterId || null,
          position: newPosition || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Account Created', description: `Account for ${newEmail} has been created.` });
      setIsCreateDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('staff');
      setNewCenterId('');
      setNewPosition('');
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create account.', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || deleteConfirmText !== deleteTarget.full_name) return;
    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { user_id: deleteTarget.user_id },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'User Deleted', description: `${deleteTarget.full_name} has been permanently deleted.` });
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
      setDeleteConfirmText('');
      setDeleteStep(1);
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete user.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (userProfile: Profile) => {
    setDeleteTarget(userProfile);
    setDeleteStep(1);
    setDeleteConfirmText('');
    setIsDeleteDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Approve users, assign roles and centers.
            </p>
          </div>
          {(isSuperAdmin || isDirector) && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={centerFilter} onValueChange={setCenterFilter} disabled={!!directorCenterId}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Center" />
              </SelectTrigger>
              <SelectContent>
                {!directorCenterId && <SelectItem value="all">All Centers</SelectItem>}
                {centers.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="none">No Position</SelectItem>
                {positions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.name}>
                    {pos.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>{filteredUsers.length} user(s) found</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <p className="text-muted-foreground">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground">No users found.</p>
            ) : (
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Center</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.position || '—'}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        {userRoles[user.user_id]?.includes('super_admin') ? (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                            Owner
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="capitalize">
                            {userRoles[user.user_id]?.[0]?.replace('_', ' ') || 'staff'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{user.center?.name || '—'}</TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleQuickApprove(user)}
                                title="Approve user"
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleQuickReject(user)}
                                title="Reject user"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {(user.status === 'approved' || user.status === 'disabled' || user.status === 'inactive') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleDisable(user)}
                              title={user.status === 'disabled' || user.status === 'inactive' ? 'Enable user' : 'Deactivate user'}
                            >
                              {user.status === 'disabled' || user.status === 'inactive' ? (
                                <UserCheck className="h-4 w-4 text-green-500" />
                              ) : (
                                <UserX className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          )}
                          {/* Hide edit button for directors viewing super admins */}
                          {!(isDirector && userRoles[user.user_id]?.includes('super_admin')) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                            >
                              Edit
                            </Button>
                          )}
                          {/* Delete button - super admin only, cannot delete other super admins */}
                          {isSuperAdmin && !userRoles[user.user_id]?.includes('super_admin') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteDialog(user)}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user status, role, and center assignment.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{selectedUser.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>

                {selectedUser.application_message && (
                  <div>
                    <Label>Application Message</Label>
                    <p className="mt-1 text-sm text-muted-foreground rounded-md bg-muted p-3">
                      {selectedUser.application_message}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="approved">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  {editStatus === 'disabled' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Disabled users lose access but their historical records are preserved.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={editRole}
                    onValueChange={setEditRole}
                    disabled={selectedUser?.user_id === user?.id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      {!isDirector && (
                        <SelectItem value="director">Director</SelectItem>
                      )}
                      {isSuperAdmin && (
                        <SelectItem value="super_admin">Super Admin (Owner)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedUser?.user_id === user?.id
                      ? 'You cannot change your own role. Ask another Super Admin to update it.'
                      : 'Directors can manage users and content but cannot access settings or edit Super Admins.'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="position">Title / Position</Label>
                  <Select value={editPosition || "none"} onValueChange={(val) => setEditPosition(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No position</SelectItem>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.name}>
                          {pos.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="center">Center</Label>
                  <Select value={editCenterId || "none"} onValueChange={(val) => setEditCenterId(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select center" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No center</SelectItem>
                      {centers.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={editHireDate}
                    onChange={(e) => setEditHireDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for anniversary year tracking of training hours.
                  </p>
                </div>

                {tracks.length > 0 && (
                  <div>
                    <Label className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Assigned Training Tracks
                    </Label>
                    <div className="mt-2 space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                      {tracks.map((track) => (
                        <div key={track.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`track-${track.id}`}
                            checked={editTrackIds.includes(track.id)}
                            onCheckedChange={(checked) => handleTrackToggle(track.id, checked as boolean)}
                          />
                          <label
                            htmlFor={`track-${track.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {track.title}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select the training tracks this user should complete.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveUser}>Save Changes</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Account Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
              <DialogDescription>
                Create a new user account with immediate access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newFullName">Full Name</Label>
                <Input
                  id="newFullName"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="newEmail">Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label htmlFor="newRole">Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    {isSuperAdmin && (
                      <>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="newPosition">Position</Label>
                <Select value={newPosition || "none"} onValueChange={(val) => setNewPosition(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No position</SelectItem>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.name}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="newCenter">Center</Label>
                <Select value={newCenterId || "none"} onValueChange={(val) => setNewCenterId(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select center" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No center</SelectItem>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAccount} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(''); setDeleteStep(1); } setIsDeleteDialogOpen(open); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                {deleteStep === 1 ? 'Delete User?' : 'Final Confirmation'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  {deleteStep === 1 ? (
                    <>
                      <p>
                        You are about to permanently delete <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.email}).
                      </p>
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        <strong>⚠️ Warning:</strong> This will permanently remove all data associated with this user including training progress, certificates, submissions, reflections, documents, and hours logs.
                      </div>
                    </>
                  ) : (
                    <>
                      <p>This action is <strong>IRREVERSIBLE</strong>. Type the user's full name to confirm.</p>
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        Type <strong>"{deleteTarget?.full_name}"</strong> below to confirm permanent deletion.
                      </div>
                    </>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteStep === 1 ? (
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); setDeleteStep(1); }}>
                  Cancel
                </AlertDialogCancel>
                <Button variant="destructive" onClick={() => setDeleteStep(2)}>
                  Yes, I want to delete
                </Button>
              </AlertDialogFooter>
            ) : (
              <>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTarget?.full_name}
                  className="border-destructive"
                />
                <AlertDialogFooter>
                  <Button variant="outline" onClick={() => setDeleteStep(1)}>
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteUser}
                    disabled={deleteConfirmText !== deleteTarget?.full_name || isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete Permanently'
                    )}
                  </Button>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
