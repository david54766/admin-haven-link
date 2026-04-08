import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ColorThemePickerProps {
  primaryColor: string;
  accentColor: string;
  onPrimaryChange: (color: string) => void;
  onAccentChange: (color: string) => void;
}

// Predefined color themes (HSL values without the hsl() wrapper)
const COLOR_PRESETS = [
  { name: 'Purple', hsl: '280 85% 65%', hex: '#a855f7' },
  { name: 'Blue', hsl: '217 91% 60%', hex: '#3b82f6' },
  { name: 'Green', hsl: '142 71% 45%', hex: '#22c55e' },
  { name: 'Orange', hsl: '25 95% 53%', hex: '#f97316' },
  { name: 'Red', hsl: '0 84% 60%', hex: '#ef4444' },
  { name: 'Pink', hsl: '340 82% 62%', hex: '#ec4899' },
  { name: 'Teal', hsl: '173 80% 40%', hex: '#14b8a6' },
  { name: 'Indigo', hsl: '239 84% 67%', hex: '#6366f1' },
  { name: 'Amber', hsl: '38 92% 50%', hex: '#f59e0b' },
  { name: 'Cyan', hsl: '189 94% 43%', hex: '#06b6d4' },
];

// Convert hex to HSL string (e.g., "280 85% 65%")
function hexToHsl(hex: string): string | null {
  // Remove # if present and validate
  const cleanHex = hex.replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return null;
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Convert HSL string to hex
function hslToHex(hslString: string): string {
  const match = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return '#000000';

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function ColorSwatch({ 
  color, 
  isSelected, 
  onClick, 
}: { 
  color: { name: string; hsl: string; hex: string }; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-10 h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center',
        isSelected 
          ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20' 
          : 'border-transparent hover:border-muted-foreground/50'
      )}
      style={{ backgroundColor: color.hex }}
      title={color.name}
    >
      {isSelected && <Check className="h-5 w-5 text-white drop-shadow-md" />}
    </button>
  );
}

function ColorInput({
  label,
  description,
  hslValue,
  onChange,
}: {
  label: string;
  description: string;
  hslValue: string;
  onChange: (hsl: string) => void;
}) {
  const [hexInput, setHexInput] = useState(hslToHex(hslValue));
  const [isValid, setIsValid] = useState(true);

  // Sync hex input when HSL value changes externally
  useEffect(() => {
    setHexInput(hslToHex(hslValue));
    setIsValid(true);
  }, [hslValue]);

  const handleHexChange = (value: string) => {
    // Allow typing by updating input immediately
    setHexInput(value);
    
    // Validate and convert
    const cleanValue = value.startsWith('#') ? value : `#${value}`;
    const hsl = hexToHsl(cleanValue);
    
    if (hsl) {
      setIsValid(true);
      onChange(hsl);
    } else {
      setIsValid(value.length < 7); // Only invalid if full length
    }
  };

  const isPreset = COLOR_PRESETS.some(p => p.hsl === hslValue);

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((color) => (
          <ColorSwatch
            key={`${label}-${color.name}`}
            color={color}
            isSelected={hslValue === color.hsl}
            onClick={() => onChange(color.hsl)}
          />
        ))}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg border-2 border-muted flex-shrink-0"
          style={{ backgroundColor: isValid ? hexInput : '#ccc' }}
        />
        <div className="flex-1 max-w-[140px]">
          <Input
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#a855f7"
            maxLength={7}
            className={cn(
              'font-mono text-sm',
              !isValid && 'border-destructive focus-visible:ring-destructive'
            )}
          />
        </div>
        {!isPreset && isValid && (
          <span className="text-xs text-muted-foreground">Custom</span>
        )}
      </div>
    </div>
  );
}

export function ColorThemePicker({ 
  primaryColor, 
  accentColor, 
  onPrimaryChange, 
  onAccentChange 
}: ColorThemePickerProps) {
  return (
    <div className="space-y-6">
      <ColorInput
        label="Primary Color"
        description="Used for buttons, links, and key interactive elements."
        hslValue={primaryColor}
        onChange={onPrimaryChange}
      />

      <ColorInput
        label="Accent Color"
        description="Used for highlights and secondary emphasis."
        hslValue={accentColor}
        onChange={onAccentChange}
      />

      {/* Preview */}
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground mb-3">Preview</p>
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: `hsl(${primaryColor})` }}
          >
            Primary Button
          </button>
          <button 
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: `hsl(${accentColor})` }}
          >
            Accent Button
          </button>
          <span 
            className="text-sm font-medium"
            style={{ color: `hsl(${primaryColor})` }}
          >
            Link Text
          </span>
        </div>
      </div>
    </div>
  );
}
