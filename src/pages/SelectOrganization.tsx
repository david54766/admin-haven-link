import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Search, ArrowRight } from 'lucide-react';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  branding: any;
  is_active: boolean;
}

const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000001';

interface Props {
  /** Where to send users once they pick an org. Becomes /t/{slug}/{destination}. */
  destination: 'apply' | 'register' | 'login';
}

export default function SelectOrganization({ destination }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('list_active_tenants');
        if (error) throw error;
        const list = ((data || []) as Tenant[])
          .filter((t) => t.is_active && t.id !== PLATFORM_TENANT_ID && t.slug !== 'default');
        setTenants(list);
      } catch (e) {
        console.error('Failed to load organizations', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
  }, [tenants, query]);

  const labels = {
    apply: { title: 'Apply to Work', cta: 'Apply', desc: 'Choose the organization you want to apply to.' },
    register: { title: 'Create Your Account', cta: 'Register', desc: 'Choose your organization to register as a new staff member.' },
    login: { title: 'Log In', cta: 'Log in', desc: 'Choose your organization to continue.' },
  }[destination];

  const goTo = (slug: string) => {
    const search = searchParams.toString();
    navigate(`/t/${slug}/${destination}${search ? `?${search}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{labels.title}</CardTitle>
          <CardDescription>{labels.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground">
                No organizations are accepting registrations right now.
              </p>
              <p className="text-sm text-muted-foreground">
                If you were given a direct link by your employer, please use that link.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="org-search">Find your organization</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="org-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No organizations match "{query}".
                  </p>
                ) : (
                  filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => goTo(t.slug)}
                      className="w-full text-left rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-colors p-4 flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">/t/{t.slug}/{destination}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground">
                        {labels.cta}
                        <ArrowRight className="ml-1 w-4 h-4" />
                      </Button>
                    </button>
                  ))
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Don't see your organization? Ask your administrator for a direct registration link.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
