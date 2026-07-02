import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/api-response.js';

/**
 * Tras tenantMiddleware + authMiddleware, exige que el JWT pertenezca al mismo
 * restaurante que el header X-Tenant-ID (evita acceso cruzado entre tenants).
 */
export const requireTenantMatch = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.tenant) {
    next();
    return;
  }

  if (req.user.tenantId !== req.tenant._id.toString()) {
    next(
      new AppError(
        'El token no corresponde a este restaurante. Verificá el identificador (slug) al iniciar sesión.',
        403
      )
    );
    return;
  }

  next();
};
