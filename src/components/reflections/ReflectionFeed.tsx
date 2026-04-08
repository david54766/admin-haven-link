import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Check, X, BookOpen, Lock, Users } from 'lucide-react';
import { SelfReflection, Module } from '@/types/database';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const MOOD_MAP: Record<string, { emoji: string; label: string }> = {
  inspired: { emoji: '✨', label: 'Inspired' },
  accomplished: { emoji: '🎯', label: 'Accomplished' },
  curious: { emoji: '🤔', label: 'Curious' },
  challenged: { emoji: '💪', label: 'Challenged' },
  grateful: { emoji: '🙏', label: 'Grateful' },
  focused: { emoji: '🔥', label: 'Focused' },
  relaxed: { emoji: '😌', label: 'Relaxed' },
  proud: { emoji: '🌟', label: 'Proud' },
};

interface ExtendedReflection extends SelfReflection {
  mood?: string | null;
  tags?: string[] | null;
  is_private?: boolean;
}

interface ReflectionFeedProps {
  reflections: ExtendedReflection[];
  modules: Module[];
  onEdit: (id: string, data: { 
    title: string; 
    content: string; 
    moduleId: string;
    mood: string;
    tags: string[];
    isPrivate: boolean;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  userName?: string;
}

export function ReflectionFeed({ reflections, modules, onEdit, onDelete, userName = 'You' }: ReflectionFeedProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editModuleId, setEditModuleId] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editTagInput, setEditTagInput] = useState('');

  const startEdit = (reflection: ExtendedReflection) => {
    setEditingId(reflection.id);
    setEditTitle(reflection.title || '');
    setEditContent(reflection.content);
    setEditModuleId(reflection.module_id || '');
    setEditMood(reflection.mood || '');
    setEditTags(reflection.tags || []);
    setEditIsPrivate(reflection.is_private || false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditModuleId('');
    setEditMood('');
    setEditTags([]);
    setEditIsPrivate(false);
    setEditTagInput('');
  };

  const saveEdit = async (id: string) => {
    await onEdit(id, { 
      title: editTitle, 
      content: editContent, 
      moduleId: editModuleId,
      mood: editMood,
      tags: editTags,
      isPrivate: editIsPrivate
    });
    cancelEdit();
  };

  const addEditTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim();
    if (normalized && !editTags.includes(normalized) && editTags.length < 5) {
      setEditTags([...editTags, normalized]);
    }
    setEditTagInput('');
  };

  const removeEditTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const cardColors = [
    'border-l-brand-blue',
    'border-l-brand-purple',
    'border-l-brand-green',
    'border-l-brand-red',
    'border-l-brand-yellow',
    'border-l-brand-orange',
  ];

  if (reflections.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="h-8 w-8 text-brand-purple" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No reflections yet</h3>
        <p className="text-muted-foreground mt-1">
          Start documenting your learning journey by sharing your first reflection above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reflections.map((reflection, index) => {
        const isEditing = editingId === reflection.id;
        const colorClass = cardColors[index % cardColors.length];
        const timeAgo = formatDistanceToNow(new Date(reflection.created_at), { addSuffix: true });
        const fullDate = format(new Date(reflection.created_at), 'MMMM d, yyyy \'at\' h:mm a');
        const moodInfo = reflection.mood ? MOOD_MAP[reflection.mood] : null;

        return (
          <Card 
            key={reflection.id} 
            className={cn(
              "border-2 border-l-4 transition-all hover:shadow-md",
              colorClass
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{userName}</span>
                      {moodInfo && (
                        <span className="text-sm" title={moodInfo.label}>
                          {moodInfo.emoji}
                        </span>
                      )}
                      {reflection.is_private ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="h-3 w-3" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Users className="h-3 w-3" />
                          Shared
                        </Badge>
                      )}
                      {reflection.module && (
                        <Badge variant="secondary" className="text-xs">
                          {reflection.module.title}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground" title={fullDate}>
                      {timeAgo}
                    </p>
                  </div>
                </div>
                
                {!isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEdit(reflection)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(reflection.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Title (optional)"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="border-2"
                  />
                  <Select value={editModuleId} onValueChange={setEditModuleId}>
                    <SelectTrigger className="border-2">
                      <SelectValue placeholder="Related module (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No module</SelectItem>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={editMood} onValueChange={setEditMood}>
                    <SelectTrigger className="border-2">
                      <SelectValue placeholder="Mood (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No mood</SelectItem>
                      {Object.entries(MOOD_MAP).map(([value, { emoji, label }]) => (
                        <SelectItem key={value} value={value}>
                          {emoji} {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {editTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          #{tag}
                          <button
                            type="button"
                            onClick={() => removeEditTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {editTags.length < 5 && (
                        <Input
                          placeholder="Add tag..."
                          value={editTagInput}
                          onChange={(e) => setEditTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addEditTag(editTagInput);
                            }
                          }}
                          onBlur={() => editTagInput && addEditTag(editTagInput)}
                          className="border-2 h-7 w-28 text-sm"
                        />
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[120px] border-2"
                  />
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/30">
                    <div className="flex items-center gap-2">
                      {editIsPrivate ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Users className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm">
                        {editIsPrivate ? 'Personal only' : 'Shared with admin'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit-privacy-toggle" className="text-xs text-muted-foreground">
                        Make private
                      </Label>
                      <Switch
                        id="edit-privacy-toggle"
                        checked={editIsPrivate}
                        onCheckedChange={setEditIsPrivate}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(reflection.id)} disabled={!editContent.trim()}>
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {reflection.title && (
                    <h3 className="font-semibold text-foreground">{reflection.title}</h3>
                  )}
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {reflection.content}
                  </p>
                  {reflection.tags && reflection.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {reflection.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
