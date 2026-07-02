const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG ?? 'bistro-digital';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tenantSlug = TENANT_SLUG;
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
  tenantSlug = slug.trim().toLowerCase() || TENANT_SLUG;
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
      const res = await fetch('/api/v1/auth/refresh', {
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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  allowRetry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'X-Tenant-ID': tenantSlug,
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && allowRetry && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, false);
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

export async function authLogin<T>(email: string, password: string): Promise<T> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantSlug,
    },
    body: JSON.stringify({ email, password }),
  });

  const parsed = await parseResponse<T>(res);
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Error de autenticación');
  }
  return parsed.data as T;
}

export function authHeaders(): Record<string, string> {
  return {
    'X-Tenant-ID': tenantSlug,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}
