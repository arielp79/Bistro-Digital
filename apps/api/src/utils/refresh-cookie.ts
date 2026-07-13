import type { CookieOptions } from 'express';

/** En producción (front en Netlify + API en otro host) hace falta SameSite=None. */
export function refreshTokenCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
