import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Eye, Settings, RotateCcw } from 'lucide-react';

export interface TextField {
  id: string;
  label: string;
  content_key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: string;
  fontWeight: string;
  visible?: boolean;
}

const DEFAULT_FIELDS: TextField[] = [
  { id: '1', label: 'Staff Name', content_key: 'staff_name', x: 20, y: 30, width: 65, height: 12, fontSize: 38, fontFamily: 'Georgia, serif', color: '#1a202c', textAlign: 'center', fontWeight: 'bold', visible: true },
  { id: '2', label: 'Track Title', content_key: 'track_title', x: 20, y: 52, width: 65, height: 8, fontSize: 22, fontFamily: 'Georgia, serif', color: '#2b6cb0', textAlign: 'center', fontWeight: 'bold', visible: true },
  { id: '3', label: 'Hours', content_key: 'hours_earned', x: 20, y: 62, width: 65, height: 6, fontSize: 15, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal', visible: true },
  { id: '4', label: 'Date', content_key: 'issued_date', x: 20, y: 74, width: 30, height: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal', visible: true },
  { id: '5', label: 'Instructor', content_key: 'instructor_name', x: 55, y: 74, width: 30, height: 6, fontSize: 13, fontFamily: 'Georgia, serif', color: '#4a5568', textAlign: 'center', fontWeight: 'normal', visible: true },
  { id: '6', label: 'Certificate #', content_key: 'certificate_number', x: 20, y: 88, width: 65, height: 5, fontSize: 10, fontFamily: 'Georgia, serif', color: '#9ca3af', textAlign: 'center', fontWeight: 'normal', visible: true },
  { id: '7', label: 'Expiry Date', content_key: 'expiry_date', x: 20, y: 82, width: 65, height: 5, fontSize: 11, fontFamily: 'Georgia, serif', color: '#6b7280', textAlign: 'center', fontWeight: 'normal', visible: true },
];

const CONTENT_KEYS = [
  { value: 'staff_name', label: 'Staff Name' },
  { value: 'track_title', label: 'Track/Module Title' },
  { value: 'center_name', label: 'Center Name' },
  { value: 'instructor_name', label: 'Instructor Name' },
  { value: 'hours_earned', label: 'Hours Earned' },
  { value: 'issued_date', label: 'Date Issued' },
  { value: 'expiry_date', label: 'Expiry Date' },
  { value: 'certificate_number', label: 'Certificate Number' },
  { value: 'custom_text', label: 'Custom Text' },
];

const FONT_FAMILIES = [
  'Georgia, serif', 'serif', 'sans-serif', 'Times New Roman', 'Arial', 'Helvetica',
];

const PREVIEW_DATA: Record<string, string> = {
  staff_name: 'John Doe',
  track_title: 'New Hire Orientation',
  center_name: 'Main Center',
  instructor_name: 'Jane Smith',
  hours_earned: '40 Training Hours',
  issued_date: 'March 3, 2026',
  expiry_date: 'Expires: March 3, 2027',
  certificate_number: 'TC-A1B2C3D4',
  custom_text: 'Certificate of Completion',
};

interface Props {
  textFields: TextField[];
  backgroundImageUrl: string | null;
  onTextFieldsChange: (fields: TextField[]) => void;
  onBackgroundChange: (url: string | null) => void;
}

export function CertificateTemplateEditor({ textFields, backgroundImageUrl, onTextFieldsChange, onBackgroundChange }: Props) {
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [editorTab, setEditorTab] = useState<string>('preview');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; fieldX: number; fieldY: number } | null>(null);

  const fields = textFields.length > 0 ? textFields : DEFAULT_FIELDS;

  const handleReset = () => {
    onTextFieldsChange(DEFAULT_FIELDS.map(f => ({ ...f, id: crypto.randomUUID() })));
    setSelectedFieldIndex(null);
  };

  const updateField = (index: number, updates: Partial<TextField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    onTextFieldsChange(newFields);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // For now we create an object URL; the parent should handle actual upload
    const url = URL.createObjectURL(file);
    onBackgroundChange(url);
  };

  // Mouse drag on preview
  const handleMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFieldIndex(idx);
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      fieldX: fields[idx].x,
      fieldY: fields[idx].y,
    };
    setIsDragging(true);

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStartRef.current || !canvasRef.current) return;
      const r = canvasRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - dragStartRef.current.x) / r.width) * 100;
      const dy = ((ev.clientY - dragStartRef.current.y) / r.height) * 100;
      const newX = Math.max(0, Math.min(100 - fields[idx].width, dragStartRef.current.fieldX + dx));
      const newY = Math.max(0, Math.min(100 - fields[idx].height, dragStartRef.current.fieldY + dy));
      updateField(idx, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const visibleFields = fields.filter(f => f.visible !== false);
  const selectedField = selectedFieldIndex !== null ? fields[selectedFieldIndex] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Text Placement Editor</p>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      </div>

      <Tabs value={editorTab} onValueChange={setEditorTab}>
        <TabsList className="w-full">
          <TabsTrigger value="preview" className="flex-1 text-xs">
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex-1 text-xs">
            <Settings className="h-3.5 w-3.5 mr-1" />
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-3">
          {/* Canvas preview */}
          <div className="border rounded-lg overflow-hidden">
            <div
              ref={canvasRef}
              className="relative bg-white mx-auto select-none"
              style={{ width: '100%', aspectRatio: '1.414', maxWidth: 700 }}
            >
              {backgroundImageUrl && (
                <img
                  src={backgroundImageUrl}
                  alt="Certificate background"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}
              {!backgroundImageUrl && (
                <img
                  src="/images/default-certificate-bg.png"
                  alt="Default certificate background"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}
              {visibleFields.map((field) => {
                const realIdx = fields.findIndex(f => f.id === field.id);
                return (
                  <div
                    key={field.id}
                    className={`absolute cursor-move transition-shadow ${
                      selectedFieldIndex === realIdx
                        ? 'ring-2 ring-primary ring-offset-1 bg-primary/5'
                        : 'hover:ring-1 hover:ring-primary/40'
                    }`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                      fontSize: `${field.fontSize * 0.5}px`,
                      fontFamily: field.fontFamily,
                      color: field.color,
                      textAlign: field.textAlign as any,
                      fontWeight: field.fontWeight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start',
                      overflow: 'hidden',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, realIdx)}
                    onClick={() => setSelectedFieldIndex(realIdx)}
                  >
                    {PREVIEW_DATA[field.content_key] || field.label}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Drag to reposition. Drag the corner handle to resize. Click to select, then switch to Properties tab.
          </p>
        </TabsContent>

        <TabsContent value="properties" className="mt-3 space-y-3">
          {/* Field list with visibility toggles */}
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className={`flex items-center gap-3 p-2.5 rounded-md border text-sm cursor-pointer ${
                  selectedFieldIndex === idx ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setSelectedFieldIndex(idx)}
              >
                <Switch
                  checked={field.visible !== false}
                  onCheckedChange={(checked) => updateField(idx, { visible: checked })}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                />
                <span className="flex-1 font-medium">{field.label}</span>
              </div>
            ))}
          </div>

          {/* Selected field detail editor */}
          {selectedField && selectedFieldIndex !== null ? (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold">Editing: {selectedField.label}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={selectedField.label} onChange={e => updateField(selectedFieldIndex, { label: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Content</Label>
                  <Select value={selectedField.content_key} onValueChange={val => updateField(selectedFieldIndex, { content_key: val })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTENT_KEYS.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">X (%)</Label>
                  <Input type="number" value={selectedField.x} onChange={e => updateField(selectedFieldIndex, { x: Number(e.target.value) })} className="h-8 text-sm" min={0} max={100} />
                </div>
                <div>
                  <Label className="text-xs">Y (%)</Label>
                  <Input type="number" value={selectedField.y} onChange={e => updateField(selectedFieldIndex, { y: Number(e.target.value) })} className="h-8 text-sm" min={0} max={100} />
                </div>
                <div>
                  <Label className="text-xs">Width (%)</Label>
                  <Input type="number" value={selectedField.width} onChange={e => updateField(selectedFieldIndex, { width: Number(e.target.value) })} className="h-8 text-sm" min={1} max={100} />
                </div>
                <div>
                  <Label className="text-xs">Height (%)</Label>
                  <Input type="number" value={selectedField.height} onChange={e => updateField(selectedFieldIndex, { height: Number(e.target.value) })} className="h-8 text-sm" min={1} max={100} />
                </div>
              </div>

              <div>
                <Label className="text-xs">Font Size: {selectedField.fontSize}px</Label>
                <Slider
                  value={[selectedField.fontSize]}
                  onValueChange={([val]) => updateField(selectedFieldIndex, { fontSize: val })}
                  min={8}
                  max={72}
                  step={1}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Font</Label>
                  <Select value={selectedField.fontFamily} onValueChange={val => updateField(selectedFieldIndex, { fontFamily: val })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Align</Label>
                  <Select value={selectedField.textAlign} onValueChange={val => updateField(selectedFieldIndex, { textAlign: val })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Weight</Label>
                  <Select value={selectedField.fontWeight} onValueChange={val => updateField(selectedFieldIndex, { fontWeight: val })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={selectedField.color}
                    onChange={e => updateField(selectedFieldIndex, { color: e.target.value })}
                    className="h-8 w-10 rounded border cursor-pointer"
                  />
                  <Input value={selectedField.color} onChange={e => updateField(selectedFieldIndex, { color: e.target.value })} className="h-8 text-sm flex-1" />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Select a field above to edit its properties.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
