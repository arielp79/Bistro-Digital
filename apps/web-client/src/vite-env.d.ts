/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_TABLE_ID?: string;
  readonly VITE_DEFAULT_TENANT_SLUG?: string;
  /** URL absoluta de la API (ej. https://api.onrender.com). Vacío = mismo origen. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
