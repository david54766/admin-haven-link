import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users } from 'lucide-react';

interface Position {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  order_index: number;
}

export function PositionsManager() {
  const { toast } = useToast();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('order_index');
    if (!error) setPositions(data || []);
    setIsLoading(false);
  };

  const openDialog = (position?: Position) => {
    if (position) {
      setEditing(position);
      setName(position.name);
      setDescription(position.description || '');
    } else {
      setEditing(null);
      setName('');
      setDescription('');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Name Required', variant: 'destructive' });
      return;
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from('positions')
          .update({ name, description: description || null })
          .eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Position Updated' });
      } else {
        const maxOrder = positions.length > 0 ? Math.max(...positions.map(p => p.order_index)) + 1 : 0;
        const { error } = await supabase
          .from('positions')
          .insert({ name, description: description || null, order_index: maxOrder });
        if (error) throw error;
        toast({ title: 'Position Created' });
      }
      setIsDialogOpen(false);
      fetchPositions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will also remove any track-position assignments.')) return;
    try {
      const { error } = await supabase.from('positions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Position Deleted' });
      fetchPositions();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="flex flex-row items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Positions
          </h3>
          <p className="text-sm text-muted-foreground">Staff positions used for role-based track assignment</p>
        </div>
        <Button size="sm" onClick={() => openDialog()}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : positions.length === 0 ? (
        <p className="text-muted-foreground">No positions configured.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((pos) => (
              <TableRow key={pos.id}>
                <TableCell className="font-medium">{pos.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{pos.description || '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openDialog(pos)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(pos.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Position' : 'Add Position'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="posName">Name *</Label>
              <Input id="posName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lead Teacher" />
            </div>
            <div>
              <Label htmlFor="posDesc">Description</Label>
              <Input id="posDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
