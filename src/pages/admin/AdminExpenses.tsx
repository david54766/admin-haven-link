import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { CalendarIcon, DollarSign, TrendingUp, PieChart as PieChartIcon, Plus, Trash2, Pencil, ArrowUpDown, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';
import { HoursTimeFilter, TimePreset } from '@/components/admin/HoursTimeFilter';

const CATEGORIES = ['supplies', 'payroll', 'maintenance', 'food', 'utilities', 'other'];
const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', '#f59e0b', '#10b981', '#8b5cf6'];

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
};

type SortKey = 'date' | 'amount' | 'category';

export default function AdminExpenses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [customRange, setCustomRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Expense[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        amount: parseFloat(amount),
        category,
        date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        notes: notes || null,
        created_by: user?.id,
      };
      if (editingExpense) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: editingExpense ? 'Expense updated' : 'Expense added' });
      resetForm();
    },
    onError: () => toast({ title: 'Error saving expense', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense deleted' });
    },
  });

  const resetForm = () => {
    setTitle(''); setAmount(''); setCategory('other'); setDate(new Date()); setNotes(''); setEditingExpense(null); setDialogOpen(false);
  };

  const openEdit = (e: Expense) => {
    setEditingExpense(e); setTitle(e.title); setAmount(String(e.amount)); setCategory(e.category);
    setDate(parseISO(e.date)); setNotes(e.notes || ''); setDialogOpen(true);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleTimeFilterChange = (startDate: Date | null, endDate: Date | null, preset: TimePreset) => {
    setTimePreset(preset);
    setCustomRange({ start: startDate, end: endDate });
  };

  const filtered = useMemo(() => {
    let list = filterCategory === 'all' ? expenses : expenses.filter(e => e.category === filterCategory);
    // Apply date range filter
    if (customRange.start && customRange.end) {
      list = list.filter(e => {
        const d = parseISO(e.date);
        return d >= customRange.start! && d <= customRange.end!;
      });
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else cmp = a.category.localeCompare(b.category);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [expenses, filterCategory, sortKey, sortAsc, customRange]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const monthlyTotal = expenses.filter(e => { const d = parseISO(e.date); return d >= monthStart && d <= monthEnd; }).reduce((s, e) => s + e.amount, 0);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const monthlyTrends = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => {
      const key = format(parseISO(e.date), 'MMM yyyy');
      map[key] = (map[key] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const cumulativeData = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    return sorted.map(e => {
      cumulative += e.amount;
      return { date: format(parseISO(e.date), 'MMM d'), cumulative };
    });
  }, [filtered]);

  const topCategory = categoryTotals[0]?.name || '—';

  const exportCsv = () => {
    const headers = ['Date', 'Title', 'Category', 'Amount', 'Notes'];
    const rows = filtered.map(e => [
      format(parseISO(e.date), 'yyyy-MM-dd'),
      `"${e.title.replace(/"/g, '""')}"`,
      e.category,
      e.amount.toFixed(2),
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground">Expense Tracker</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />Export CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Expense name" /></div>
                  <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
                  <div><Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date</Label>
                    <Popover><PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent></Popover>
                  </div>
                  <div><Label>Notes (optional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
                  <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!title || !amount || saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : editingExpense ? 'Update' : 'Add Expense'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">{timePreset === 'all' ? 'Total All-Time' : 'Filtered Total'}</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${totalFiltered.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">This Month</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Top Category</CardTitle><PieChartIcon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold capitalize">{topCategory}</div></CardContent></Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {categoryTotals.length > 0 && (
            <Card><CardHeader><CardTitle className="text-sm font-medium">Category Breakdown</CardTitle></CardHeader><CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={categoryTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryTotals.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie><Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} /></PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent></Card>
          )}
          {monthlyTrends.length > 0 && (
            <Card><CardHeader><CardTitle className="text-sm font-medium">Monthly Trends</CardTitle></CardHeader><CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent></Card>
          )}
          {cumulativeData.length > 0 && (
            <Card><CardHeader><CardTitle className="text-sm font-medium">Cumulative Spending</CardTitle></CardHeader><CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent></Card>
          )}
        </div>

        {/* Time Filter */}
        <Card><CardContent className="pt-6">
          <HoursTimeFilter onFilterChange={handleTimeFilterChange} currentPreset={timePreset} customRange={customRange} />
        </CardContent></Card>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Label>Category:</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card><CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('date')}>Date <ArrowUpDown className="inline h-3 w-3" /></TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('category')}>Category <ArrowUpDown className="inline h-3 w-3" /></TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => toggleSort('amount')}>Amount <ArrowUpDown className="inline h-3 w-3" /></TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No expenses found</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{format(parseISO(e.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell className="capitalize">{e.category}</TableCell>
                  <TableCell className="text-right">${e.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{e.notes || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete expense?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(e.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </Layout>
  );
}
