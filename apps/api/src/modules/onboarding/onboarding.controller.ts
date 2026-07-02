import type { Request, Response, NextFunction } from 'express';
import { registerTenantSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { env } from '../../config/env.js';
import { OnboardingService } from './onboarding.service.js';
import { slugifyName } from '../../data/starter-tenant.data.js';
import { ONBOARDING_PLANS } from '../../data/onboarding-plans.data.js';

export const listPlans = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json(apiSuccess(ONBOARDING_PLANS));
  } catch (error) {
    next(error);
  }
};

export const checkSlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const raw = typeof req.query.slug === 'string' ? req.query.slug : '';
    if (!raw.trim()) throw new AppError('Parámetro slug requerido', 400);
    const result = await OnboardingService.isSlugAvailable(raw);
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
};

export const suggestSlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const name = typeof req.query.name === 'string' ? req.query.name : '';
    if (!name.trim()) throw new AppError('Parámetro name requerido', 400);
    let base = slugifyName(name);
    if (base.length < 3) base = `${base}-restaurant`.slice(0, 48);

    let candidate = base;
    let suffix = 1;
    while (!(await OnboardingService.isSlugAvailable(candidate)).available && suffix < 100) {
      candidate = `${base}-${suffix}`.slice(0, 48);
      suffix += 1;
    }

    const check = await OnboardingService.isSlugAvailable(candidate);
    res.json(apiSuccess({ suggested: check.slug, available: check.available }));
  } catch (error) {
    next(error);
  }
};

export const registerTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!env.onboardingEnabled) {
      throw new AppError('El registro de nuevos restaurantes no está habilitado', 403);
    }

    const parsed = registerTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const result = await OnboardingService.register(parsed.data);
    res.status(201).json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
};
