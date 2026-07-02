import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTenantStore } from '../stores/tenant.store';
import { readSlugFromSearch } from '../utils/tenant-resolve';

/** Redirige a la pantalla de selección si no hay tenant resuelto. */
export function RequireTenant({ children }: { children: React.ReactNode }) {
  const slug = useTenantStore((s) => s.slug);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tenantFromUrl = readSlugFromSearch(searchParams.toString());

  if (!slug && !tenantFromUrl) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
