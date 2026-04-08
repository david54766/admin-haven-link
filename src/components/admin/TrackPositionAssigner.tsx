import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Position {
  id: string;
  name: string;
}

interface TrackPositionAssignerProps {
  trackId: string;
}

export function TrackPositionAssigner({ trackId }: TrackPositionAssignerProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [posRes, assignRes] = await Promise.all([
        supabase.from('positions').select('id, name').eq('is_active', true).order('order_index'),
        supabase.from('track_position_assignments').select('position_id').eq('track_id', trackId),
      ]);
      setPositions(posRes.data || []);
      setAssignedIds(new Set((assignRes.data || []).map((a: any) => a.position_id)));
      setIsLoading(false);
    };
    fetchData();
  }, [trackId]);

  const togglePosition = async (positionId: string) => {
    const isAssigned = assignedIds.has(positionId);

    if (isAssigned) {
      await supabase
        .from('track_position_assignments')
        .delete()
        .eq('track_id', trackId)
        .eq('position_id', positionId);
      setAssignedIds((prev) => {
        const next = new Set(prev);
        next.delete(positionId);
        return next;
      });
    } else {
      await supabase
        .from('track_position_assignments')
        .insert({ track_id: trackId, position_id: positionId });
      setAssignedIds((prev) => new Set(prev).add(positionId));
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading positions...</p>;
  if (positions.length === 0) return <p className="text-sm text-muted-foreground">No positions configured. Add positions in Settings.</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Auto-assign to positions</p>
      <p className="text-xs text-muted-foreground">
        When a user with one of these positions is approved, this track will be automatically assigned.
      </p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {positions.map((pos) => (
          <div key={pos.id} className="flex items-center gap-2">
            <Checkbox
              id={`pos-${pos.id}`}
              checked={assignedIds.has(pos.id)}
              onCheckedChange={() => togglePosition(pos.id)}
            />
            <Label htmlFor={`pos-${pos.id}`} className="text-sm cursor-pointer">
              {pos.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
