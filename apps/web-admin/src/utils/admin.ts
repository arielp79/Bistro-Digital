import { getTenantSlug } from '../lib/api';

export function toLocalizedText(text: string): { es: string; en: string; pt: string } {
  const t = text.trim();
  return { es: t, en: t, pt: t };
}

export const WEB_CLIENT_URL =
  (import.meta.env.VITE_WEB_CLIENT_URL as string | undefined) ?? 'http://localhost:5173';

export function buildTableQrUrl(tableId: string, tenantSlug?: string): string {
  const slug = (tenantSlug ?? getTenantSlug()).trim().toLowerCase();
  return `${WEB_CLIENT_URL}/menu?table=${tableId}&tenant=${slug}`;
}
