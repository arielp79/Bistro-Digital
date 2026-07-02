export function toLocalizedText(text: string): { es: string; en: string; pt: string } {
  const t = text.trim();
  return { es: t, en: t, pt: t };
}

export const WEB_CLIENT_URL =
  (import.meta.env.VITE_WEB_CLIENT_URL as string | undefined) ?? 'http://localhost:5173';

export const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG ?? 'bistro-digital';

export function buildTableQrUrl(tableId: string): string {
  return `${WEB_CLIENT_URL}/menu?table=${tableId}&tenant=${TENANT_SLUG}`;
}
