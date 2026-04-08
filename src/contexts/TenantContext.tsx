import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  branding: Record<string, any>;
  is_active: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: string;
  isLoading: boolean;
}

// Default tenant ID for backward compatibility
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantId: DEFAULT_TENANT_ID,
  isLoading: true,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const resolveTenant = async () => {
      try {
        // For now, resolve tenant from URL slug or default
        // Future: support subdomain/custom domain resolution
        const hostname = window.location.hostname;
        const pathParts = window.location.pathname.split('/');
        
        // Check for path-based tenant: /t/{slug}/...
        let slug = 'default';
        if (pathParts[1] === 't' && pathParts[2]) {
          slug = pathParts[2];
        }
        
        // Could also check subdomain
        // const subdomain = hostname.split('.')[0];
        // if (subdomain !== 'www' && subdomain !== 'localhost') slug = subdomain;

        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (data) {
          setTenant(data as Tenant);
        } else {
          // Fallback to default tenant
          const { data: defaultTenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', DEFAULT_TENANT_ID)
            .single();
          
          if (defaultTenant) {
            setTenant(defaultTenant as Tenant);
          }
        }
      } catch (error) {
        console.error('Error resolving tenant:', error);
      } finally {
        setIsLoading(false);
      }
    };

    resolveTenant();
  }, []);

  const tenantId = tenant?.id || DEFAULT_TENANT_ID;

  return (
    <TenantContext.Provider value={{ tenant, tenantId, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

export { DEFAULT_TENANT_ID };
