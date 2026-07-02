import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@bistro/shared-types';
import { AppError } from '../utils/api-response.js';
import { verifyAccessToken } from '../utils/jwt.js';
import type { ITenant } from '../modules/tenant/tenant.model.js';

export interface AuthUser {
  id: string;
  tenantId: string;
  role: UserRole;
  impersonatedBy?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenant?: ITenant;
    }
  }
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Token de acceso requerido', 401));
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      ...(payload.impersonatedBy && { impersonatedBy: payload.impersonatedBy }),
    };
    next();
  } catch {
    next(new AppError('Token inválido o expirado', 401));
  }
};

export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      ...(payload.impersonatedBy && { impersonatedBy: payload.impersonatedBy }),
    };
  } catch {
    // Sin auth — rutas públicas
  }
  next();
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('Acceso denegado', 403));
      return;
    }
    next();
  };

export const requirePlatformAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'platform_admin') {
    next(new AppError('Acceso denegado — se requiere rol platform_admin', 403));
    return;
  }
  next();
};
