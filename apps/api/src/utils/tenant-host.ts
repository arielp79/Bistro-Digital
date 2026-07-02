import { env } from '../config/env.js';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

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

/** Quita protocolo, path y puerto de un dominio o URL. */
export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '');
  value = value.split('/')[0] ?? '';
  value = value.split(':')[0] ?? '';
  return value;
}

export function normalizeHost(host: string | undefined): string | null {
  if (!host?.trim()) return null;
  return normalizeDomain(host);
}

export function isValidCustomDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (domain === 'localhost') return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return false;
  return DOMAIN_PATTERN.test(domain);
}

export function defaultTenantDomain(slug: string): string {
  const base = env.nodeEnv === 'production' ? env.platformBaseDomain : 'local';
  return `${slug}.${base}`;
}

export function isDefaultTenantDomain(domain: string, slug: string): boolean {
  const normalized = normalizeDomain(domain);
  return (
    normalized === defaultTenantDomain(slug) ||
    normalized === `${slug}.local` ||
    normalized === `${slug}.${env.platformBaseDomain}`
  );
}

/** Extrae slug desde subdominio de la plataforma (ej. parrilla.saas-base.com o parrilla.local). */
export function extractSlugFromHostname(
  hostname: string,
  platformBaseDomain = env.platformBaseDomain
): string | null {
  const host = normalizeDomain(hostname);
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

export function buildClientUrl(domain: string, slug: string): string {
  const normalized = normalizeDomain(domain);
  if (isDefaultTenantDomain(normalized, slug)) {
    return `${env.clientBaseUrl.replace(/\/$/, '')}/?tenant=${slug}`;
  }
  const protocol = env.nodeEnv === 'production' ? 'https' : 'http';
  return `${protocol}://${normalized}`;
}

export function dnsCnameTarget(): string {
  return env.platformCnameTarget;
}
