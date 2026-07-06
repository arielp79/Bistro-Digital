import { env } from './env.js';

/** Orígenes LAN para probar QR desde el celular (Vite con host: true). */
const DEV_LAN_ORIGIN =
  /^https?:\/\/(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d+)?$/;

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;

  if (env.nodeEnv === 'development') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    if (DEV_LAN_ORIGIN.test(origin)) return true;
    return env.corsOrigin.includes(origin);
  }

  return env.corsOrigin.includes(origin);
}

export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (isAllowedCorsOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS bloqueado para origen: ${origin}`));
  },
  credentials: true,
};
