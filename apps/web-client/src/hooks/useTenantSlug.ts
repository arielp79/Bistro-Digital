import { useTenantStore } from '../stores/tenant.store';

/** Slug del tenant; solo usar en rutas protegidas por RequireTenant. */
export function useTenantSlug(): string {
  return useTenantStore((s) => s.slug)!;
}
