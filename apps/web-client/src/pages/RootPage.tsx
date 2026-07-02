import { useTenantStore } from '../stores/tenant.store';
import { HomePage } from './HomePage';
import { TenantSelectPage } from './TenantSelectPage';

/** Muestra selección de restaurante o home según si hay tenant resuelto. */
export function RootPage() {
  const slug = useTenantStore((s) => s.slug);
  if (!slug) return <TenantSelectPage />;
  return <HomePage />;
}
