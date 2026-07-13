import { apiUrl } from '../lib/api-base';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidSlugFormat(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 48 && SLUG_PATTERN.test(slug);
}

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().split(':')[0] ?? '';
}

/** Extrae slug desde subdominio de plataforma (ej. parrilla.saas-base.com o parrilla.local). */
export function extractSlugFromHostname(
  hostname: string,
  platformBaseDomain = 'saas-base.com'
): string | null {
  const host = normalizeHost(hostname);
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const parts = host.split('.');

  if (parts.length === 2 && parts[1] === 'local') {
    const normalized = normalizeSlug(parts[0] ?? '');
    return isValidSlugFormat(normalized) ? normalized : null;
  }

  const baseParts = platformBaseDomain.split('.');
  if (parts.length >= baseParts.length + 1) {
    const hostBase = parts.slice(-baseParts.length).join('.');
    if (hostBase === platformBaseDomain) {
      const subdomain = parts.slice(0, -baseParts.length).join('.');
      if (!subdomain || subdomain === 'www' || subdomain === 'app') return null;
      const normalized = normalizeSlug(subdomain);
      return isValidSlugFormat(normalized) ? normalized : null;
    }
  }

  return null;
}

export function readSlugFromSearch(search: string): string | null {
  const fromUrl = new URLSearchParams(search).get('tenant');
  if (!fromUrl) return null;
  const normalized = normalizeSlug(fromUrl);
  return normalized || null;
}

export function readDevDefaultSlug(): string | null {
  const fromEnv = import.meta.env.VITE_DEFAULT_TENANT_SLUG as string | undefined;
  if (!fromEnv?.trim()) return null;
  const normalized = normalizeSlug(fromEnv);
  return isValidSlugFormat(normalized) ? normalized : null;
}

export function shouldResolveCustomDomain(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return false;
  }
  return extractSlugFromHostname(host) === null;
}

export async function resolveTenantSlugFromHost(hostname: string): Promise<string | null> {
  if (!shouldResolveCustomDomain(hostname)) return null;

  try {
    const res = await fetch(apiUrl(`/api/v1/tenant/resolve?host=${encodeURIComponent(hostname)}`));
    const json = await res.json();
    if (!res.ok || json.error || !json.data?.slug) return null;
    return json.data.slug as string;
  } catch {
    return null;
  }
}
