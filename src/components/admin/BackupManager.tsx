import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, RefreshCw, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface BackupFile {
  name: string;
  created_at: string;
  metadata: Record<string, any>;
}

export function BackupManager() {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .list('', { sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      setBackups((data || []) as BackupFile[]);
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBackup = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-backup');
      if (error) throw error;
      toast({
        title: 'Backup Created',
        description: `Exported ${data.totalTables} tables with ${data.totalRecords} records.`,
      });
      fetchBackups();
    } catch (error: any) {
      toast({ title: 'Backup Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const downloadBackup = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .download(fileName);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: 'Download Failed', description: error.message, variant: 'destructive' });
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Backups are stored securely and contain all platform data in JSON format.
        </p>
        <Button onClick={createBackup} disabled={isCreating}>
          {isCreating ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          {isCreating ? 'Creating...' : 'Create Backup'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading backups...</p>
      ) : backups.length === 0 ? (
        <p className="text-muted-foreground">No backups yet. Create your first backup above.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((backup) => (
              <TableRow key={backup.name}>
                <TableCell className="font-medium text-sm">{backup.name}</TableCell>
                <TableCell className="text-sm">
                  {new Date(backup.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{formatSize(backup.metadata?.size)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => downloadBackup(backup.name)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
