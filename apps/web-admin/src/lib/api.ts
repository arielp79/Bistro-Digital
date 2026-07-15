import { apiUrl } from './api-base';

const DEFAULT_TENANT_SLUG = (import.meta.env.VITE_TENANT_SLUG as string | undefined)?.trim() ?? '';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tenantSlug = DEFAULT_TENANT_SLUG;
let refreshPromise: Promise<string | null> | null = null;

type TokenPayload = { accessToken: string; refreshToken: string };

let onTokensRefreshed: ((tokens: TokenPayload) => void) | null = null;
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
}

export function setTenantSlug(slug: string) {
  tenantSlug = slug.trim().toLowerCase();
}

export function getTenantSlug(): string {
  return tenantSlug;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setOnTokensRefreshed(handler: ((tokens: TokenPayload) => void) | null) {
  onTokensRefreshed = handler;
}

export function setOnAuthFailure(handler: (() => void) | null) {
  onAuthFailure = handler;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(apiUrl('/api/v1/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      const json = await res.json();

      if (!res.ok || json.error || !json.data?.accessToken) {
        return null;
      }

      const newAccess = json.data.accessToken as string;
      const newRefresh = (json.data.refreshToken as string) ?? refreshToken;

      accessToken = newAccess;
      refreshToken = newRefresh;
      onTokensRefreshed?.({ accessToken: newAccess, refreshToken: newRefresh });

      return newAccess;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function parseResponse<T>(res: Response): Promise<{ ok: boolean; data?: T; error?: string }> {
  const json = await res.json();
  if (!res.ok || json.error) {
    return { ok: false, error: json.error ?? `Error ${res.status}` };
  }
  return { ok: true, data: json.data as T };
}

async function requestWithAuth<T>(
  path: string,
  options: RequestInit = {},
  tenantOverride?: string,
  allowRetry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'X-Tenant-ID': tenantOverride ?? tenantSlug,
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(apiUrl(path), { ...options, headers, credentials: 'include' });

  if (res.status === 401 && allowRetry && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return requestWithAuth<T>(path, options, tenantOverride, false);
    }
    onAuthFailure?.();
    throw new Error('Sesión expirada. Volvé a iniciar sesión.');
  }

  const parsed = await parseResponse<T>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? `Error ${res.status}`);
  }
  return parsed.data as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  tenantOverride?: string
): Promise<T> {
  return requestWithAuth<T>(path, options, tenantOverride);
}

/** Peticiones sin tenant (onboarding público). */
export async function publicFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(apiUrl(path), { ...options, headers });
  const parsed = await parseResponse<T>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? `Error ${res.status}`);
  }
  return parsed.data as T;
}

/** Login staff — guarda tokens en memoria (el store persiste refresh). */
export async function authLogin<T>(
  path: string,
  body: unknown,
  tenant: string
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenant,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new Error('Credenciales inválidas');
  }

  const parsed = await parseResponse<T>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Error de autenticación');
  }
  return parsed.data as T;
}

/** Peticiones super-admin (sin X-Tenant-ID). */
async function platformRequest<T>(
  path: string,
  options: RequestInit = {},
  allowRetry = true
): Promise<{ data: T; meta?: { page?: number; limit?: number; total?: number } }> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(apiUrl(path), { ...options, headers, credentials: 'include' });

  if (res.status === 401 && allowRetry && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return platformRequest<T>(path, options, false);
    }
    onAuthFailure?.();
    throw new Error('Sesión expirada. Volvé a iniciar sesión.');
  }

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  return { data: json.data as T, meta: json.meta };
}

export async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const result = await platformRequest<T>(path, options);
  return result.data;
}

export async function platformFetchWithMeta<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: { page?: number; limit?: number; total?: number } }> {
  return platformRequest<T>(path, options);
}

/** Login super-admin — sin tenant. */
export async function platformLogin<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new Error('Credenciales inválidas');
  }

  const parsed = await parseResponse<T>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Error de autenticación');
  }
  return parsed.data as T;
}
