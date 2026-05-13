import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Building, FileType, Settings2, RefreshCw, Palette, ClipboardList, Clock, Database, Download, Link2, Copy, Check, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Center, DocumentType } from '@/types/database';
import { useContentDefaults } from '@/hooks/useContentDefaults';
import { useBranding } from '@/hooks/useBranding';
import { LogoUploader } from '@/components/admin/LogoUploader';
import { ColorThemePicker } from '@/components/admin/ColorThemePicker';
import { ApplicationFormBuilder } from '@/components/admin/ApplicationFormBuilder';
import { PositionsManager } from '@/components/admin/PositionsManager';
import { useComplianceSettings, ComplianceConfig } from '@/hooks/useComplianceSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackupManager } from '@/components/admin/BackupManager';

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [centers, setCenters] = useState<Center[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Content defaults
  const { systemDefaults, updateSystemDefaults, isLoading: isDefaultsLoading } = useContentDefaults();
  const [defaultAllowMarkComplete, setDefaultAllowMarkComplete] = useState(false);
  const [defaultAllowDownload, setDefaultAllowDownload] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isApplyingGlobal, setIsApplyingGlobal] = useState(false);

  // Branding
  const { branding, updateBranding, isLoading: isBrandingLoading } = useBranding();
  const [localBusinessName, setLocalBusinessName] = useState('');
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  useEffect(() => {
    if (!isBrandingLoading) {
      setLocalBusinessName(branding.business_name);
    }
  }, [isBrandingLoading, branding.business_name]);

  // Compliance settings
  const { config: complianceConfig, updateConfig: updateComplianceConfig, isLoading: isComplianceLoading } = useComplianceSettings();
  const [localCompliance, setLocalCompliance] = useState<ComplianceConfig | null>(null);
  const [isSavingCompliance, setIsSavingCompliance] = useState(false);

  useEffect(() => {
    if (!isComplianceLoading) {
      setLocalCompliance(complianceConfig);
    }
  }, [isComplianceLoading, complianceConfig]);

  // Sync local state with fetched defaults
  useEffect(() => {
    setDefaultAllowMarkComplete(systemDefaults.allow_mark_complete);
    setDefaultAllowDownload(systemDefaults.allow_download);
  }, [systemDefaults]);

  // Dialog state
  const [isCenterDialogOpen, setIsCenterDialogOpen] = useState(false);
  const [isDocTypeDialogOpen, setIsDocTypeDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [editingDocType, setEditingDocType] = useState<DocumentType | null>(null);

  // Form state
  const [centerName, setCenterName] = useState('');
  const [centerAddress, setCenterAddress] = useState('');
  const [docTypeName, setDocTypeName] = useState('');
  const [docTypeDescription, setDocTypeDescription] = useState('');

  // Tenant registration links
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [centersRes, docTypesRes, profileRes] = await Promise.all([
        supabase.from('centers').select('*').order('name'),
        supabase.from('document_types').select('*').order('name'),
        supabase.rpc('get_own_profile'),
      ]);

      setCenters((centersRes.data || []) as Center[]);
      setDocumentTypes((docTypesRes.data || []) as DocumentType[]);

      const tenantId = (profileRes.data as any)?.[0]?.tenant_id;
      if (tenantId) {
        const { data: tenants } = await supabase.rpc('list_active_tenants');
        const t = (tenants || []).find((x: any) => x.id === tenantId);
        if (t) setTenantSlug(t.slug);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      toast({ title: 'Link copied', description: url });
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const openCenterDialog = (center?: Center) => {
    if (center) {
      setEditingCenter(center);
      setCenterName(center.name);
      setCenterAddress(center.address || '');
    } else {
      setEditingCenter(null);
      setCenterName('');
      setCenterAddress('');
    }
    setIsCenterDialogOpen(true);
  };

  const openDocTypeDialog = (docType?: DocumentType) => {
    if (docType) {
      setEditingDocType(docType);
      setDocTypeName(docType.name);
      setDocTypeDescription(docType.description || '');
    } else {
      setEditingDocType(null);
      setDocTypeName('');
      setDocTypeDescription('');
    }
    setIsDocTypeDialogOpen(true);
  };

  const handleSaveCenter = async () => {
    if (!centerName.trim()) {
      toast({ title: 'Name Required', variant: 'destructive' });
      return;
    }

    try {
      if (editingCenter) {
        const { error } = await supabase
          .from('centers')
          .update({ name: centerName, address: centerAddress || null })
          .eq('id', editingCenter.id);
        if (error) throw error;
        toast({ title: 'Center Updated' });
      } else {
        const { error } = await supabase
          .from('centers')
          .insert({ name: centerName, address: centerAddress || null });
        if (error) throw error;
        toast({ title: 'Center Created' });
      }

      setIsCenterDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteCenter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this center?')) return;

    try {
      const { error } = await supabase.from('centers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Center Deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveDocType = async () => {
    if (!docTypeName.trim()) {
      toast({ title: 'Name Required', variant: 'destructive' });
      return;
    }

    try {
      if (editingDocType) {
        const { error } = await supabase
          .from('document_types')
          .update({ name: docTypeName, description: docTypeDescription || null })
          .eq('id', editingDocType.id);
        if (error) throw error;
        toast({ title: 'Document Type Updated' });
      } else {
        const { error } = await supabase
          .from('document_types')
          .insert({ name: docTypeName, description: docTypeDescription || null });
        if (error) throw error;
        toast({ title: 'Document Type Created' });
      }

      setIsDocTypeDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteDocType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document type?')) return;

    try {
      const { error } = await supabase.from('document_types').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Document Type Deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveDefaults = async () => {
    setIsSavingDefaults(true);
    const result = await updateSystemDefaults({
      allow_mark_complete: defaultAllowMarkComplete,
      allow_download: defaultAllowDownload,
    });
    setIsSavingDefaults(false);

    if (result.success) {
      toast({ title: 'Content Defaults Updated' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleApplyGlobalDefaults = async () => {
    setIsApplyingGlobal(true);
    
    try {
      // Update all videos
      const { error: videosError } = await supabase
        .from('videos')
        .update({ allow_mark_complete: systemDefaults.allow_mark_complete });
      if (videosError) throw videosError;
      
      // Update all presentations
      const { error: presentationsError } = await supabase
        .from('module_presentations')
        .update({ 
          allow_mark_complete: systemDefaults.allow_mark_complete,
          allow_download: systemDefaults.allow_download
        });
      if (presentationsError) throw presentationsError;
      
      // Update all documents
      const { error: documentsError } = await supabase
        .from('module_documents')
        .update({ 
          allow_mark_complete: systemDefaults.allow_mark_complete,
          allow_download: systemDefaults.allow_download
        });
      if (documentsError) throw documentsError;
      
      toast({ title: 'Global Defaults Applied', description: 'All content has been updated to match system defaults.' });
    } catch (error: any) {
      console.error('Error applying global defaults:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsApplyingGlobal(false);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage system settings, centers, and document types.
          </p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="general" className="flex items-center gap-1.5">
              <Settings2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-1.5">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="application" className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Application Form
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Hours Compliance
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-1.5">
              <Building className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="links" className="flex items-center gap-1.5">
              <Link2 className="h-4 w-4" />
              Registration Links
            </TabsTrigger>
            <TabsTrigger value="backups" className="flex items-center gap-1.5">
              <Database className="h-4 w-4" />
              Backups
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Content Defaults</CardTitle>
                <CardDescription>
                  Default settings for new videos, presentations, and documents. These can be overridden per track.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isDefaultsLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="defaultAllowMarkComplete">Allow Mark Complete</Label>
                        <p className="text-sm text-muted-foreground">
                          When enabled, staff can manually mark content as complete
                        </p>
                      </div>
                      <Switch
                        id="defaultAllowMarkComplete"
                        checked={defaultAllowMarkComplete}
                        onCheckedChange={setDefaultAllowMarkComplete}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="defaultAllowDownload">Allow Download</Label>
                        <p className="text-sm text-muted-foreground">
                          When enabled, staff can download presentations and documents
                        </p>
                      </div>
                      <Switch
                        id="defaultAllowDownload"
                        checked={defaultAllowDownload}
                        onCheckedChange={setDefaultAllowDownload}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveDefaults} disabled={isSavingDefaults}>
                        {isSavingDefaults ? 'Saving...' : 'Save Defaults'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" disabled={isApplyingGlobal}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isApplyingGlobal ? 'animate-spin' : ''}`} />
                            Apply to All Content
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apply Defaults to All Content?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will update ALL existing videos, presentations, and documents to match the current system defaults:
                              <br /><br />
                              • Allow Mark Complete: <strong>{systemDefaults.allow_mark_complete ? 'Yes' : 'No'}</strong><br />
                              • Allow Download: <strong>{systemDefaults.allow_download ? 'Yes' : 'No'}</strong>
                              <br /><br />
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleApplyGlobalDefaults}>
                              Apply to All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>
                  Customize your organization's logo, name, and colors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isBrandingLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <div className="flex gap-2">
                        <Input
                          id="businessName"
                          value={localBusinessName}
                          onChange={(e) => setLocalBusinessName(e.target.value)}
                          placeholder="Training Portal"
                          className="max-w-sm"
                        />
                        <Button 
                          disabled={isSavingBranding || localBusinessName === branding.business_name}
                          onClick={async () => {
                            setIsSavingBranding(true);
                            const result = await updateBranding({ business_name: localBusinessName });
                            setIsSavingBranding(false);
                            if (result.success) {
                              toast({ title: 'Business name updated' });
                            } else {
                              toast({ title: 'Error', description: result.error, variant: 'destructive' });
                            }
                          }}
                        >
                          {isSavingBranding ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This name appears next to your logo in the header.
                      </p>
                    </div>
                    <LogoUploader
                      currentLogoUrl={branding.logo_url}
                      onLogoChange={async (url) => {
                        const result = await updateBranding({ logo_url: url });
                        if (!result.success) {
                          toast({
                            title: 'Error',
                            description: result.error || 'Failed to update branding.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    />
                    <div className="pt-4 border-t">
                      <ColorThemePicker
                        primaryColor={branding.primary_color}
                        accentColor={branding.accent_color}
                        onPrimaryChange={(color) => updateBranding({ primary_color: color })}
                        onAccentChange={(color) => updateBranding({ accent_color: color })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Application Form Tab */}
          <TabsContent value="application">
            <Card>
              <CardHeader>
                <CardTitle>Application Form</CardTitle>
                <CardDescription>
                  Customize the staff application form fields and configure email notification recipients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationFormBuilder />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hours Compliance Tab */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Hours Compliance Configuration</CardTitle>
                <CardDescription>
                  Configure training hour requirements, status thresholds, and tracking period. Most states require 12–24 hours annually.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isComplianceLoading || !localCompliance ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-8">
                    {/* Default Required Hours */}
                    <div className="space-y-2">
                      <Label htmlFor="defaultRequiredHours">Default Required Hours Per Year</Label>
                      <p className="text-sm text-muted-foreground">
                        This is the default annual requirement for new staff. Individual goals can still be set per user.
                      </p>
                      <Input
                        id="defaultRequiredHours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={localCompliance.default_required_hours}
                        onChange={(e) =>
                          setLocalCompliance({
                            ...localCompliance,
                            default_required_hours: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="max-w-[200px]"
                      />
                    </div>

                    {/* Tracking Period */}
                    <div className="space-y-2">
                      <Label>Tracking Period</Label>
                      <p className="text-sm text-muted-foreground">
                        How the annual hours window is calculated for each employee.
                      </p>
                      <Select
                        value={localCompliance.tracking_period}
                        onValueChange={(v) =>
                          setLocalCompliance({
                            ...localCompliance,
                            tracking_period: v as 'calendar_year' | 'anniversary_year' | 'fiscal_year',
                          })
                        }
                      >
                        <SelectTrigger className="max-w-[300px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="calendar_year">
                            Calendar Year (Jan 1 – Dec 31)
                          </SelectItem>
                          <SelectItem value="anniversary_year">
                            Employment Anniversary Year (hire date based)
                          </SelectItem>
                          <SelectItem value="fiscal_year">
                            Custom Fiscal Year
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {localCompliance.tracking_period === 'anniversary_year' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Hours reset each year based on the employee's hire date.
                        </p>
                      )}
                      {localCompliance.tracking_period === 'fiscal_year' && (
                        <div className="mt-3 space-y-3 p-4 rounded-lg border bg-muted/30">
                          <p className="text-sm font-medium">Fiscal Year Start Date</p>
                          <p className="text-xs text-muted-foreground">
                            Training hours will reset annually on this date.
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="fiscalMonth" className="text-xs">Month</Label>
                              <Select
                                value={String(localCompliance.fiscal_year_start_month)}
                                onValueChange={(v) =>
                                  setLocalCompliance({
                                    ...localCompliance,
                                    fiscal_year_start_month: parseInt(v),
                                  })
                                }
                              >
                                <SelectTrigger id="fiscalMonth" className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    'January', 'February', 'March', 'April', 'May', 'June',
                                    'July', 'August', 'September', 'October', 'November', 'December'
                                  ].map((month, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>
                                      {month}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="fiscalDay" className="text-xs">Day</Label>
                              <Input
                                id="fiscalDay"
                                type="number"
                                min="1"
                                max="31"
                                value={localCompliance.fiscal_year_start_day}
                                onChange={(e) =>
                                  setLocalCompliance({
                                    ...localCompliance,
                                    fiscal_year_start_day: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                                  })
                                }
                                className="w-[80px]"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Example: Fiscal year runs from{' '}
                            {['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'
                            ][localCompliance.fiscal_year_start_month - 1]}{' '}
                            {localCompliance.fiscal_year_start_day} to{' '}
                            {['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'
                            ][(localCompliance.fiscal_year_start_month - 2 + 12) % 12]}{' '}
                            {localCompliance.fiscal_year_start_day > 1 ? localCompliance.fiscal_year_start_day - 1 : 
                              new Date(2024, localCompliance.fiscal_year_start_month - 1, 0).getDate()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status Thresholds */}
                    <div className="space-y-4">
                      <div>
                        <Label>Status Thresholds (Red / Yellow / Green)</Label>
                        <p className="text-sm text-muted-foreground">
                          Define the percentage breakpoints for compliance status colors.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <Label className="text-sm">Red (At Risk)</Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Below {localCompliance.thresholds.yellow_min}%
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-yellow-500" />
                            <Label htmlFor="yellowMin" className="text-sm">Yellow (Behind) starts at</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              id="yellowMin"
                              type="number"
                              min="0"
                              max="100"
                              value={localCompliance.thresholds.yellow_min}
                              onChange={(e) =>
                                setLocalCompliance({
                                  ...localCompliance,
                                  thresholds: {
                                    ...localCompliance.thresholds,
                                    yellow_min: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            <Label htmlFor="greenMin" className="text-sm">Green (On Track) starts at</Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              id="greenMin"
                              type="number"
                              min="0"
                              max="100"
                              value={localCompliance.thresholds.green_min}
                              onChange={(e) =>
                                setLocalCompliance({
                                  ...localCompliance,
                                  thresholds: {
                                    ...localCompliance.thresholds,
                                    green_min: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Visual preview */}
                      <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                        <p className="text-xs font-medium mb-2">Preview</p>
                        <div className="flex h-4 rounded-full overflow-hidden">
                          <div
                            className="bg-red-500"
                            style={{ width: `${localCompliance.thresholds.yellow_min}%` }}
                          />
                          <div
                            className="bg-yellow-500"
                            style={{ width: `${localCompliance.thresholds.green_min - localCompliance.thresholds.yellow_min}%` }}
                          />
                          <div
                            className="bg-green-500"
                            style={{ width: `${100 - localCompliance.thresholds.green_min}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>0%</span>
                          <span>{localCompliance.thresholds.yellow_min}%</span>
                          <span>{localCompliance.thresholds.green_min}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={async () => {
                        setIsSavingCompliance(true);
                        const result = await updateComplianceConfig(localCompliance);
                        setIsSavingCompliance(false);
                        if (result.success) {
                          toast({ title: 'Compliance Settings Saved' });
                        } else {
                          toast({ title: 'Error', description: result.error, variant: 'destructive' });
                        }
                      }}
                      disabled={isSavingCompliance}
                    >
                      {isSavingCompliance ? 'Saving...' : 'Save Compliance Settings'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <PositionsManager />
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Centers */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Centers
                      </CardTitle>
                      <CardDescription>Childcare center locations</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openCenterDialog()}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <p className="text-muted-foreground">Loading...</p>
                    ) : centers.length === 0 ? (
                      <p className="text-muted-foreground">No centers configured.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {centers.map((center) => (
                            <TableRow key={center.id}>
                              <TableCell className="font-medium">{center.name}</TableCell>
                              <TableCell>{center.address || '—'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => openCenterDialog(center)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleDeleteCenter(center.id)}>
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

                {/* Document Types */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileType className="h-5 w-5" />
                        Document Types
                      </CardTitle>
                      <CardDescription>Categories for staff documents</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openDocTypeDialog()}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <p className="text-muted-foreground">Loading...</p>
                    ) : documentTypes.length === 0 ? (
                      <p className="text-muted-foreground">No document types configured.</p>
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
                          {documentTypes.map((docType) => (
                            <TableRow key={docType.id}>
                              <TableCell className="font-medium">{docType.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {docType.description || '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => openDocTypeDialog(docType)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => handleDeleteDocType(docType.id)}>
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
              </div>
            </div>
          </TabsContent>

          {/* Registration Links Tab */}
          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Your Organization's Registration Links
                </CardTitle>
                <CardDescription>
                  Share these links with applicants and staff so they're automatically added to your organization. Anyone using the generic /apply or /register links will land in the platform tenant instead.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!tenantSlug ? (
                  <p className="text-muted-foreground">Loading your organization's links...</p>
                ) : (
                  <div className="space-y-4">
                    {[
                      { key: 'apply', label: 'New Applicant Form', desc: 'Public application form for prospective staff', path: `/t/${tenantSlug}/apply` },
                      { key: 'register', label: 'Staff Self-Registration', desc: 'Direct sign-up link for invited staff', path: `/t/${tenantSlug}/register` },
                      { key: 'login', label: 'Branded Login Page', desc: 'Login page that shows your organization branding', path: `/t/${tenantSlug}/login` },
                    ].map(({ key, label, desc, path }) => {
                      const url = `${window.location.origin}${path}`;
                      const isCopied = copiedKey === key;
                      return (
                        <div key={key} className="rounded-lg border p-4 space-y-2">
                          <div>
                            <p className="font-semibold">{label}</p>
                            <p className="text-sm text-muted-foreground">{desc}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                            <Button type="button" variant="outline" size="sm" onClick={() => copyLink(key, url)}>
                              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              <span className="ml-1.5 hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground pt-2">
                      💡 Tip: When you create staff accounts directly from the Users page, they're already auto-assigned to your organization — no link needed.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backups Tab */}
          <TabsContent value="backups">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Platform Backups
                </CardTitle>
                <CardDescription>
                  Create and download full platform backups. Backups include all data tables exported as JSON.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BackupManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Center Dialog */}
        <Dialog open={isCenterDialogOpen} onOpenChange={setIsCenterDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCenter ? 'Edit Center' : 'Add Center'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="centerName">Name *</Label>
                <Input id="centerName" value={centerName} onChange={(e) => setCenterName(e.target.value)} placeholder="Center name" />
              </div>
              <div>
                <Label htmlFor="centerAddress">Address</Label>
                <Input id="centerAddress" value={centerAddress} onChange={(e) => setCenterAddress(e.target.value)} placeholder="Center address" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCenterDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveCenter}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Document Type Dialog */}
        <Dialog open={isDocTypeDialogOpen} onOpenChange={setIsDocTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDocType ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="docTypeName">Name *</Label>
                <Input id="docTypeName" value={docTypeName} onChange={(e) => setDocTypeName(e.target.value)} placeholder="Document type name" />
              </div>
              <div>
                <Label htmlFor="docTypeDescription">Description</Label>
                <Input id="docTypeDescription" value={docTypeDescription} onChange={(e) => setDocTypeDescription(e.target.value)} placeholder="Brief description" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDocTypeDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveDocType}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
