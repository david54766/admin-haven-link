import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, ChevronDown, ChevronUp, X, Lock, Users } from 'lucide-react';
import { Module } from '@/types/database';
import { cn } from '@/lib/utils';

const MOOD_OPTIONS = [
  { value: 'inspired', emoji: '✨', label: 'Inspired' },
  { value: 'accomplished', emoji: '🎯', label: 'Accomplished' },
  { value: 'curious', emoji: '🤔', label: 'Curious' },
  { value: 'challenged', emoji: '💪', label: 'Challenged' },
  { value: 'grateful', emoji: '🙏', label: 'Grateful' },
  { value: 'focused', emoji: '🔥', label: 'Focused' },
  { value: 'relaxed', emoji: '😌', label: 'Relaxed' },
  { value: 'proud', emoji: '🌟', label: 'Proud' },
];

const SUGGESTED_TAGS = [
  'learning', 'breakthrough', 'challenge', 'teamwork', 
  'growth', 'feedback', 'goal', 'milestone'
];

interface ReflectionPostBoxProps {
  modules: Module[];
  onSubmit: (data: { 
    title: string; 
    content: string; 
    moduleId: string;
    mood: string;
    tags: string[];
    isPrivate: boolean;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function ReflectionPostBox({ modules, onSubmit, isSubmitting }: ReflectionPostBoxProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    await onSubmit({ title, content, moduleId: moduleId === 'none' ? '' : moduleId, mood, tags, isPrivate });
    setContent('');
    setTitle('');
    setModuleId('');
    setMood('');
    setTags([]);
    setTagInput('');
    setIsPrivate(false);
    setShowOptions(false);
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim();
    if (normalized && !tags.includes(normalized) && tags.length < 5) {
      setTags([...tags, normalized]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <Card className={cn(
      "border-2 transition-all duration-200 reflection-post-card",
      isFocused ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border"
    )}>
      <CardContent
        className="pt-4 pb-3 space-y-3"
        onMouseDown={(e) => {
          // Prevent blur on textarea when clicking other elements inside the card
          if (e.target !== document.activeElement && isFocused) {
            const target = e.target as HTMLElement;
            // Allow textarea/input to receive focus normally
            if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
              e.preventDefault();
            }
          }
        }}
      >
        {/* Mood selector - always visible when focused */}
        {(isFocused || content) && (
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMood(mood === option.value ? '' : option.value)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all",
                  mood === option.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{option.emoji}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>
        )}

        <Textarea
          placeholder="What's on your mind? Share your thoughts, learnings, or insights..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            if (!content && !showOptions) setIsFocused(false);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/60",
            isFocused && "min-h-[120px]"
          )}
        />
        
        {(isFocused || content) && (
          <>
            {/* Privacy toggle - always visible */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/30">
              <div className="flex items-center gap-2">
                {isPrivate ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Users className="h-4 w-4 text-primary" />
                )}
                <span className="text-sm">
                  {isPrivate ? 'Personal only' : 'Shared with admin'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="privacy-toggle" className="text-xs text-muted-foreground">
                  Make private
                </Label>
                <Switch
                  id="privacy-toggle"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showOptions ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                {showOptions ? 'Less options' : 'More options'}
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  ⌘ + Enter to post
                </span>
                <Button 
                  onClick={handleSubmit}
                  disabled={!content.trim() || isSubmitting}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 shadow-md shadow-primary/25"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </Button>
              </div>
            </div>
          </>
        )}
        
        {showOptions && (
          <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
            {/* Title and Module */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title (optional)</label>
                <Input
                  placeholder="Give your reflection a title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-2 h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Related Module (optional)</label>
                <Select value={moduleId} onValueChange={setModuleId}>
                  <SelectTrigger className="border-2 h-9">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No module</SelectItem>
                    {modules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Tags (optional, max 5)</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length < 5 && (
                  <Input
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={() => tagInput && addTag(tagInput)}
                    className="border-2 h-7 w-28 text-sm"
                  />
                )}
              </div>
              {tags.length === 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">Suggestions:</span>
                  {SUGGESTED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="text-xs text-primary hover:underline"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
