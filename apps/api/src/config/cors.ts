import { env } from './env.js';

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;

  if (env.nodeEnv === 'development') {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
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
