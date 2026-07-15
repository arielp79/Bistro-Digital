/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TENANT_SLUG: string;
  /** URL absoluta de la API (ej. https://api.onrender.com). Vacío = mismo origen. */
  readonly VITE_API_URL?: string;
  /** URL pública del menú QR (para links/QR de mesas). */
  readonly VITE_WEB_CLIENT_URL?: string;
  /** true = menú admin sin Delivery IA / AFIP / piloto Meta. */
  readonly VITE_PILOT_CORE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
