import type { Request, Response, NextFunction } from 'express';
import type { TenantPlan } from '@bistro/shared-types';
import { loginSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { AuthService } from '../auth/auth.service.js';
import { PlatformService } from './platform.service.js';
import { ImpersonationAuditService } from './impersonation-audit.service.js';

export const platformLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const result = await AuthService.platformLogin(
      parsed.data.email,
      parsed.data.password,
      req.headers['user-agent'] ?? 'web'
    );

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
};

export const listTenants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const includeInactive = req.query.includeInactive === 'true';
    const plan = typeof req.query.plan === 'string' ? (req.query.plan as TenantPlan) : undefined;
    if (plan && !['starter', 'pro', 'enterprise'].includes(plan)) {
      throw new AppError('Plan inválido', 400);
    }

    const result = await PlatformService.listTenants({
      page,
      limit,
      search,
      includeInactive,
      plan,
    });
    res.json(
      apiSuccess(result.tenants, {
        page: page ?? 1,
        limit: limit ?? 20,
        total: result.total,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const updateTenantStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    if (typeof isActive !== 'boolean') {
      throw new AppError('isActive (boolean) requerido', 400);
    }

    const tenant = await PlatformService.setTenantActive(req.params.tenantId, isActive);
    res.json(apiSuccess(tenant));
  } catch (error) {
    next(error);
  }
};

export const getTenantDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const detail = await PlatformService.getTenantDetail(req.params.tenantId);
    res.json(apiSuccess(detail));
  } catch (error) {
    next(error);
  }
};

export const updateTenantPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { plan } = req.body as { plan?: TenantPlan };
    if (!plan || !['starter', 'pro', 'enterprise'].includes(plan)) {
      throw new AppError('plan requerido (starter | pro | enterprise)', 400);
    }

    const tenant = await PlatformService.setTenantPlan(req.params.tenantId, plan);
    res.json(apiSuccess(tenant));
  } catch (error) {
    next(error);
  }
};

export const impersonateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'platform_admin') {
      throw new AppError('Acceso denegado', 403);
    }

    const result = await AuthService.impersonateTenantAdmin(
      req.user.id,
      req.params.tenantId,
      req.headers['user-agent'] ?? 'web',
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? undefined,
      }
    );

    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const metrics = await PlatformService.getMetrics();
    res.json(apiSuccess(metrics));
  } catch (error) {
    next(error);
  }
};

export const cleanupE2eTenants = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await PlatformService.cleanupE2eTenants();
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
};

export const listImpersonationLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const tenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
    const tenantSlug = typeof req.query.tenantSlug === 'string' ? req.query.tenantSlug : undefined;
    const platformAdminId =
      typeof req.query.platformAdminId === 'string' ? req.query.platformAdminId : undefined;

    const result = await ImpersonationAuditService.list({
      page,
      limit,
      tenantId,
      tenantSlug,
      platformAdminId,
    });

    res.json(
      apiSuccess(result.logs, {
        page: page ?? 1,
        limit: limit ?? 20,
        total: result.total,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const endImpersonationLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'platform_admin') {
      throw new AppError('Acceso denegado', 403);
    }

    const log = await ImpersonationAuditService.endSession(req.params.auditLogId, req.user.id);
    res.json(apiSuccess(log));
  } catch (error) {
    next(error);
  }
};
