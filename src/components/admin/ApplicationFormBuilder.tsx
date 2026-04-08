import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, FileText, Mail, Users } from 'lucide-react';
import { ApplicationFormField, ApplicationNotificationRecipient } from '@/types/applicationForm';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'center_select', label: 'Center Selector' },
] as const;

function SortableFieldRow({ 
  field, 
  onEdit, 
  onDelete, 
  onToggle 
}: { 
  field: ApplicationFormField; 
  onEdit: () => void; 
  onDelete: () => void; 
  onToggle: (enabled: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8">
        <button {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{field.field_label}</span>
          {field.is_system_field && (
            <Badge variant="secondary" className="text-xs">System</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{field.field_name}</span>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{field.field_type}</Badge>
      </TableCell>
      <TableCell>
        {field.is_required ? (
          <Badge className="bg-primary/10 text-primary">Required</Badge>
        ) : (
          <span className="text-muted-foreground">Optional</span>
        )}
      </TableCell>
      <TableCell>
        <Switch 
          checked={field.is_enabled} 
          onCheckedChange={onToggle}
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          {!field.is_system_field && (
            <Button size="icon" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ApplicationFormBuilder() {
  const { toast } = useToast();
  const [fields, setFields] = useState<ApplicationFormField[]>([]);
  const [recipients, setRecipients] = useState<ApplicationNotificationRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [isRecipientDialogOpen, setIsRecipientDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<ApplicationFormField | null>(null);
  const [editingRecipient, setEditingRecipient] = useState<ApplicationNotificationRecipient | null>(null);

  // Field form state
  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<string>('text');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');

  // Recipient form state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fieldsRes, recipientsRes] = await Promise.all([
        supabase
          .from('application_form_fields')
          .select('*')
          .order('order_index'),
        supabase
          .from('application_notification_recipients')
          .select('*')
          .order('created_at'),
      ]);

      if (fieldsRes.data) {
        setFields(fieldsRes.data.map(f => ({
          ...f,
          field_type: f.field_type as ApplicationFormField['field_type'],
          field_options: Array.isArray(f.field_options) 
            ? (f.field_options as unknown as string[]) 
            : [],
        })));
      }
      if (recipientsRes.data) {
        setRecipients(recipientsRes.data);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openFieldDialog = (field?: ApplicationFormField) => {
    if (field) {
      setEditingField(field);
      setFieldName(field.field_name);
      setFieldLabel(field.field_label);
      setFieldType(field.field_type);
      setFieldPlaceholder(field.placeholder || '');
      setFieldRequired(field.is_required);
      setFieldOptions(field.field_options?.join('\n') || '');
    } else {
      setEditingField(null);
      setFieldName('');
      setFieldLabel('');
      setFieldType('text');
      setFieldPlaceholder('');
      setFieldRequired(false);
      setFieldOptions('');
    }
    setIsFieldDialogOpen(true);
  };

  const openRecipientDialog = (recipient?: ApplicationNotificationRecipient) => {
    if (recipient) {
      setEditingRecipient(recipient);
      setRecipientEmail(recipient.email);
      setRecipientName(recipient.name || '');
    } else {
      setEditingRecipient(null);
      setRecipientEmail('');
      setRecipientName('');
    }
    setIsRecipientDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!fieldLabel.trim()) {
      toast({ title: 'Label Required', variant: 'destructive' });
      return;
    }

    const name = fieldName.trim() || fieldLabel.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    const options = fieldType === 'select' 
      ? fieldOptions.split('\n').map(o => o.trim()).filter(Boolean)
      : [];

    try {
      if (editingField) {
        const updateData: any = {
          field_label: fieldLabel,
          placeholder: fieldPlaceholder || null,
          is_required: fieldRequired,
        };
        
        // Only update certain fields if not a system field
        if (!editingField.is_system_field) {
          updateData.field_name = name;
          updateData.field_type = fieldType;
          updateData.field_options = options;
        }

        const { error } = await supabase
          .from('application_form_fields')
          .update(updateData)
          .eq('id', editingField.id);
        if (error) throw error;
        toast({ title: 'Field Updated' });
      } else {
        const maxOrder = fields.length > 0 ? Math.max(...fields.map(f => f.order_index)) : -1;
        const { error } = await supabase
          .from('application_form_fields')
          .insert({
            field_name: name,
            field_label: fieldLabel,
            field_type: fieldType,
            placeholder: fieldPlaceholder || null,
            is_required: fieldRequired,
            field_options: options,
            order_index: maxOrder + 1,
          });
        if (error) throw error;
        toast({ title: 'Field Created' });
      }
      setIsFieldDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      const { error } = await supabase.from('application_form_fields').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Field Deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleField = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('application_form_fields')
        .update({ is_enabled: enabled })
        .eq('id', id);
      if (error) throw error;
      setFields(prev => prev.map(f => f.id === id ? { ...f, is_enabled: enabled } : f));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    const newFields = arrayMove(fields, oldIndex, newIndex);
    setFields(newFields);

    // Update order in database
    try {
      await Promise.all(
        newFields.map((field, index) =>
          supabase
            .from('application_form_fields')
            .update({ order_index: index })
            .eq('id', field.id)
        )
      );
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      fetchData();
    }
  };

  const handleSaveRecipient = async () => {
    if (!recipientEmail.trim()) {
      toast({ title: 'Email Required', variant: 'destructive' });
      return;
    }

    try {
      if (editingRecipient) {
        const { error } = await supabase
          .from('application_notification_recipients')
          .update({ email: recipientEmail, name: recipientName || null })
          .eq('id', editingRecipient.id);
        if (error) throw error;
        toast({ title: 'Recipient Updated' });
      } else {
        const { error } = await supabase
          .from('application_notification_recipients')
          .insert({ email: recipientEmail, name: recipientName || null });
        if (error) throw error;
        toast({ title: 'Recipient Added' });
      }
      setIsRecipientDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    try {
      const { error } = await supabase.from('application_notification_recipients').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Recipient Removed' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleToggleRecipient = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('application_notification_recipients')
        .update({ is_active: active })
        .eq('id', id);
      if (error) throw error;
      setRecipients(prev => prev.map(r => r.id === id ? { ...r, is_active: active } : r));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form Fields Builder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Application Form Fields
            </CardTitle>
            <CardDescription>
              Customize the fields shown on the staff application form. Drag to reorder.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => openFieldDialog()}>
            <Plus className="mr-1 h-4 w-4" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-muted-foreground">No fields configured.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.map((field) => (
                      <SortableFieldRow
                        key={field.id}
                        field={field}
                        onEdit={() => openFieldDialog(field)}
                        onDelete={() => handleDeleteField(field.id)}
                        onToggle={(enabled) => handleToggleField(field.id, enabled)}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Notification Recipients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notification Recipients
            </CardTitle>
            <CardDescription>
              Email addresses that will receive notifications when new applications are submitted.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => openRecipientDialog()}>
            <Plus className="mr-1 h-4 w-4" />
            Add Recipient
          </Button>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <p className="text-muted-foreground">No recipients configured. Applications will not send email notifications.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.email}</TableCell>
                    <TableCell>{recipient.name || '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={recipient.is_active}
                        onCheckedChange={(active) => handleToggleRecipient(recipient.id, active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openRecipientDialog(recipient)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleDeleteRecipient(recipient.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Field Dialog */}
      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Add Field'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fieldLabel">Label *</Label>
              <Input
                id="fieldLabel"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="e.g., Years of Experience"
              />
            </div>

            {(!editingField || !editingField.is_system_field) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fieldName">Field Name (optional)</Label>
                  <Input
                    id="fieldName"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="Auto-generated from label"
                  />
                  <p className="text-xs text-muted-foreground">Internal identifier. Leave blank to auto-generate.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fieldType">Field Type</Label>
                  <Select value={fieldType} onValueChange={setFieldType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fieldType === 'select' && (
                  <div className="space-y-2">
                    <Label htmlFor="fieldOptions">Options (one per line)</Label>
                    <textarea
                      id="fieldOptions"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={fieldOptions}
                      onChange={(e) => setFieldOptions(e.target.value)}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="fieldPlaceholder">Placeholder</Label>
              <Input
                id="fieldPlaceholder"
                value={fieldPlaceholder}
                onChange={(e) => setFieldPlaceholder(e.target.value)}
                placeholder="Placeholder text..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="fieldRequired">Required</Label>
              <Switch
                id="fieldRequired"
                checked={fieldRequired}
                onCheckedChange={setFieldRequired}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFieldDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveField}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipient Dialog */}
      <Dialog open={isRecipientDialogOpen} onOpenChange={setIsRecipientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecipient ? 'Edit Recipient' : 'Add Recipient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Email Address *</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientName">Name (optional)</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Admin Name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecipientDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRecipient}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
