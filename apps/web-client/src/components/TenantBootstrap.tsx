import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { extractSlugFromHostname, shouldResolveCustomDomain } from '../utils/tenant-resolve';
import { useTenantStore } from '../stores/tenant.store';

/** Resuelve el tenant desde URL, subdominio, dominio custom o sessionStorage. */
export function TenantBootstrap({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const setSlug = useTenantStore((s) => s.setSlug);
  const resolveFromHostname = useTenantStore((s) => s.resolveFromHostname);
  const loadConfig = useTenantStore((s) => s.loadConfig);
  const slug = useTenantStore((s) => s.slug);

  useEffect(() => {
    const fromUrl = searchParams.get('tenant');
    if (fromUrl) {
      setSlug(fromUrl);
      return;
    }

    const fromHost = extractSlugFromHostname(window.location.hostname);
    if (fromHost) {
      if (fromHost !== slug) setSlug(fromHost);
      return;
    }

    if (shouldResolveCustomDomain(window.location.hostname)) {
      void resolveFromHostname();
    }
  }, [searchParams, setSlug, slug, resolveFromHostname, location.search]);

  useEffect(() => {
    if (slug) void loadConfig();
  }, [slug, location.pathname, loadConfig]);

  return <>{children}</>;
}
