import type { Request, Response, NextFunction } from 'express';
import { updateTenantConfigSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { normalizeHost } from '../../utils/tenant-host.js';
import { TenantService } from './tenant.service.js';

export const getTenantConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) {
      res.status(400).json({ data: null, error: 'Tenant requerido' });
      return;
    }

    res.json(apiSuccess(TenantService.toPublicConfig(req.tenant)));
  } catch (error) {
    next(error);
  }
};

export const getAdminSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    res.json(apiSuccess(TenantService.toAdminSettings(req.tenant)));
  } catch (error) {
    next(error);
  }
};

export const updateTenantConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = updateTenantConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const config = await TenantService.updateConfig(req.tenant._id.toString(), parsed.data);
    res.json(apiSuccess(config));
  } catch (error) {
    next(error);
  }
};

export const resolveTenantByHost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryHost = req.query.host;
    const host =
      typeof queryHost === 'string' && queryHost.trim()
        ? normalizeHost(queryHost)
        : normalizeHost(req.headers.host);

    if (!host) {
      throw new AppError('Host no especificado', 400);
    }

    const tenant = await TenantService.resolveByHost(host);
    if (!tenant) {
      throw new AppError('Restaurante no encontrado para este dominio', 404);
    }

    res.json(
      apiSuccess({
        slug: tenant.slug,
        config: TenantService.toPublicConfig(tenant),
      })
    );
  } catch (error) {
    next(error);
  }
};
