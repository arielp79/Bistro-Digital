import type { TenantConfigPublic } from '@bistro/shared-types';
import { create } from 'zustand';
import {
  extractSlugFromHostname,
  normalizeSlug,
  readDevDefaultSlug,
  readSlugFromSearch,
  resolveTenantSlugFromHost,
} from '../utils/tenant-resolve';
import { apiUrl } from '../lib/api-base';

const TENANT_STORAGE_KEY = 'bistro_tenant_slug';

function readInitialSlug(): string | null {
  if (typeof window === 'undefined') return null;

  const fromUrl = readSlugFromSearch(window.location.search);
  if (fromUrl) {
    sessionStorage.setItem(TENANT_STORAGE_KEY, fromUrl);
    return fromUrl;
  }

  const fromHost = extractSlugFromHostname(window.location.hostname);
  if (fromHost) return fromHost;

  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem(TENANT_STORAGE_KEY);
    if (stored) return stored;
  }

  return readDevDefaultSlug();
}

interface TenantState {
  slug: string | null;
  config: TenantConfigPublic | null;
  loading: boolean;
  error: string | null;
  setSlug: (slug: string) => void;
  clearSlug: () => void;
  resolveSlug: (slug: string) => Promise<boolean>;
  resolveFromHostname: () => Promise<boolean>;
  loadConfig: () => Promise<void>;
  applyBranding: () => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  slug: readInitialSlug(),
  config: null,
  loading: false,
  error: null,

  setSlug: (slug) => {
    const normalized = normalizeSlug(slug);
    if (!normalized) return;
    const changed = get().slug !== normalized;
    sessionStorage.setItem(TENANT_STORAGE_KEY, normalized);
    set({ slug: normalized, config: changed ? null : get().config, error: null });
  },

  clearSlug: () => {
    sessionStorage.removeItem(TENANT_STORAGE_KEY);
    document.title = 'Bistró Digital';
    set({ slug: null, config: null, error: null });
  },

  resolveSlug: async (rawSlug) => {
    const normalized = normalizeSlug(rawSlug);
    if (!normalized) return false;

    get().setSlug(normalized);

    try {
      const res = await fetch(apiUrl('/api/v1/tenant/config'), {
        headers: { 'X-Tenant-ID': normalized },
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        get().clearSlug();
        return false;
      }

      set({ config: json.data, loading: false, error: null });
      get().applyBranding();
      return true;
    } catch {
      get().clearSlug();
      return false;
    }
  },

  resolveFromHostname: async () => {
    const hostname = window.location.hostname;
    const slug = await resolveTenantSlugFromHost(hostname);
    if (!slug) return false;

    get().setSlug(slug);

    try {
      const res = await fetch(apiUrl(`/api/v1/tenant/resolve?host=${encodeURIComponent(hostname)}`));
      const json = await res.json();

      if (!res.ok || json.error) {
        get().clearSlug();
        return false;
      }

      set({ config: json.data.config, loading: false, error: null });
      get().applyBranding();
      return true;
    } catch {
      get().clearSlug();
      return false;
    }
  },

  loadConfig: async () => {
    const { slug } = get();
    if (!slug) {
      set({ loading: false, config: null, error: null });
      return;
    }

    set({ loading: true, error: null, config: null });

    try {
      const res = await fetch(apiUrl('/api/v1/tenant/config'), {
        headers: { 'X-Tenant-ID': slug },
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? 'No se pudo cargar la configuración');
      }

      set({ config: json.data, loading: false });
      get().applyBranding();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error desconocido',
        loading: false,
      });
    }
  },

  applyBranding: () => {
    const { config } = get();
    if (!config) return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', config.branding.primaryColor);
    root.style.setProperty('--color-accent', config.branding.accentColor);
    root.style.setProperty('--font-family', config.branding.fontFamily);

    if (config.branding.theme === 'light') {
      root.style.setProperty('--color-background', '#FAFAFA');
      root.style.setProperty('--color-surface', '#FFFFFF');
    }

    document.title = config.name;
  },
}));
