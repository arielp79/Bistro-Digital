import type { Request, Response, NextFunction } from 'express';
import { saasCheckoutSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { StripeSaasService, isStripeSaasConfigured } from './stripe-saas.service.js';
import { ONBOARDING_PLANS } from '../../data/onboarding-plans.data.js';
import type { OnboardingPlanOption } from '@bistro/shared-types';

function enrichPlans(): OnboardingPlanOption[] {
  return ONBOARDING_PLANS.map((plan) => ({
    ...plan,
    billing: {
      requiresPayment: plan.id !== 'starter',
      checkoutAvailable:
        plan.id !== 'starter' && Boolean(StripeSaasService.resolvePriceIdForPlan(plan.id)),
    },
  }));
}

export const listSaasPlans = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json(
      apiSuccess({
        stripeConfigured: isStripeSaasConfigured(),
        plans: enrichPlans(),
      })
    );
  } catch (error) {
    next(error);
  }
};

export const createCheckout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = saasCheckoutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const session = await StripeSaasService.createCheckoutSession(req.tenant, parsed.data.plan);
    res.json(apiSuccess(session));
  } catch (error) {
    next(error);
  }
};

export const createPortal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const session = await StripeSaasService.createPortalSession(req.tenant);
    res.json(apiSuccess(session));
  } catch (error) {
    next(error);
  }
};
