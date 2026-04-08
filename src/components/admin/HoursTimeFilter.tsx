import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export type TimePreset = 
  | 'all'
  | 'today'
  | 'this-week'
  | 'last-7-days'
  | 'this-month'
  | 'last-30-days'
  | 'this-quarter'
  | 'year-to-date'
  | 'custom';

interface HoursTimeFilterProps {
  onFilterChange: (startDate: Date | null, endDate: Date | null, preset: TimePreset) => void;
  currentPreset: TimePreset;
  customRange?: { start: Date | null; end: Date | null };
}

const PRESETS: { value: TimePreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This Week' },
  { value: 'last-7-days', label: 'Last 7 Days' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'year-to-date', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

export function HoursTimeFilter({ onFilterChange, currentPreset, customRange }: HoursTimeFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customRange?.start && customRange?.end
      ? { from: customRange.start, to: customRange.end }
      : undefined
  );

  const getDateRangeForPreset = (preset: TimePreset): { start: Date | null; end: Date | null } => {
    const now = new Date();
    
    switch (preset) {
      case 'all':
        return { start: null, end: null };
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'this-week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'last-7-days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-30-days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case 'this-quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'year-to-date':
        return { start: startOfYear(now), end: endOfDay(now) };
      case 'custom':
        return { start: null, end: null };
      default:
        return { start: null, end: null };
    }
  };

  const handlePresetClick = (preset: TimePreset) => {
    if (preset === 'custom') {
      setIsCalendarOpen(true);
      return;
    }
    const range = getDateRangeForPreset(preset);
    onFilterChange(range.start, range.end, preset);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onFilterChange(startOfDay(range.from), endOfDay(range.to), 'custom');
      setIsCalendarOpen(false);
    }
  };

  const getButtonLabel = () => {
    if (currentPreset === 'custom' && customRange?.start && customRange?.end) {
      return `${format(customRange.start, 'MMM d')} - ${format(customRange.end, 'MMM d, yyyy')}`;
    }
    return PRESETS.find((p) => p.value === currentPreset)?.label || 'Select Period';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.filter((p) => p.value !== 'custom').map((preset) => (
        <Button
          key={preset.value}
          variant={currentPreset === preset.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick(preset.value)}
          className="text-xs"
        >
          {preset.label}
        </Button>
      ))}
      
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={currentPreset === 'custom' ? 'default' : 'outline'}
            size="sm"
            className={cn('text-xs', currentPreset === 'custom' && 'min-w-[160px]')}
          >
            <CalendarIcon className="mr-2 h-3 w-3" />
            {currentPreset === 'custom' && customRange?.start && customRange?.end
              ? `${format(customRange.start, 'MMM d')} - ${format(customRange.end, 'MMM d')}`
              : 'Custom Range'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
