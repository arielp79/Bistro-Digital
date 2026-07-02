import type { OrderType } from '@bistro/shared-types';

export function buildTableQuery(tableId: string | null, tenantSlug: string): string {
  if (!tableId) return '';
  const params = new URLSearchParams({ table: tableId, tenant: tenantSlug });
  return `?${params.toString()}`;
}

export function buildMenuQuery(options: {
  tableId?: string | null;
  tenantSlug: string;
  mode?: OrderType;
}): string {
  const params = new URLSearchParams({ tenant: options.tenantSlug });
  if (options.tableId) params.set('table', options.tableId);
  if (options.mode === 'delivery') params.set('mode', 'delivery');
  return `?${params.toString()}`;
}

export function buildCheckoutQuery(options: {
  tableId?: string | null;
  tenantSlug: string;
  mode?: OrderType;
}): string {
  return buildMenuQuery(options);
}

export function demoMenuPath(tenantSlug: string): string {
  const tableId = import.meta.env.VITE_DEMO_TABLE_ID as string | undefined;
  if (tableId) {
    return `/menu?table=${tableId}&tenant=${tenantSlug}`;
  }
  return `/menu?tenant=${tenantSlug}`;
}

export function deliveryMenuPath(tenantSlug: string): string {
  return `/menu?mode=delivery&tenant=${tenantSlug}`;
}
