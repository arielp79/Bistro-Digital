/** Base URL de la API. Vacío = mismo origen (proxy Vite / reverse proxy). */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() ?? '';
  return raw.replace(/\/$/, '');
}

/** Prefija paths relativos `/api/...` cuando hay VITE_API_URL (Netlify + API remota). */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/** Origen para Socket.IO (API remota o mismo host). */
export function getSocketUrl(): string {
  return getApiBaseUrl() || window.location.origin;
}
