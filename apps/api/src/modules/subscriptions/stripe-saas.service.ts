import Stripe from 'stripe';
import type { TenantPlan } from '@bistro/shared-types';
import { env } from '../../config/env.js';
import { isOnboardingPlan } from '../../data/onboarding-plans.data.js';
import { AppError } from '../../utils/api-response.js';
import { Tenant, type ITenant } from '../tenant/tenant.model.js';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!env.stripeSecretKey) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey);
  }
  return stripeClient;
}

export function isStripeSaasConfigured(): boolean {
  return Boolean(env.stripeSecretKey);
}

export function resolvePriceIdForPlan(plan: TenantPlan): string | null {
  if (plan === 'pro') return env.stripePricePro || null;
  if (plan === 'enterprise') return env.stripePriceEnterprise || null;
  return null;
}

export function resolvePlanFromPriceId(priceId: string): TenantPlan | null {
  if (env.stripePricePro && priceId === env.stripePricePro) return 'pro';
  if (env.stripePriceEnterprise && priceId === env.stripePriceEnterprise) return 'enterprise';
  return null;
}

function assertStripe(): Stripe {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new AppError('Stripe no configurado en el servidor (STRIPE_SECRET_KEY)', 503);
  }
  return stripe;
}

async function getOrCreateCustomer(stripe: Stripe, tenant: ITenant): Promise<string> {
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: tenant.name,
    metadata: {
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
    },
  });

  await Tenant.findByIdAndUpdate(tenant._id, { stripeCustomerId: customer.id });
  return customer.id;
}

export class StripeSaasService {
  static resolvePriceIdForPlan = resolvePriceIdForPlan;
  static resolvePlanFromPriceId = resolvePlanFromPriceId;

  static async createCheckoutSession(
    tenant: ITenant,
    plan: TenantPlan
  ): Promise<{ url: string; sessionId: string }> {
    if (plan === 'starter') {
      throw new AppError('El plan Starter no requiere pago', 400);
    }
    if (!isOnboardingPlan(plan)) {
      throw new AppError('Plan inválido', 400);
    }

    const priceId = resolvePriceIdForPlan(plan);
    if (!priceId) {
      throw new AppError(`Plan ${plan} no tiene precio Stripe configurado`, 503);
    }

    const stripe = assertStripe();
    const customerId = await getOrCreateCustomer(stripe, tenant);
    const base = env.webAdminUrl.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/settings?billing=success&plan=${plan}`,
      cancel_url: `${base}/settings?billing=cancel`,
      adaptive_pricing: { enabled: false },
      wallet_options: {
        link: { display: 'never' },
      },
      metadata: {
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
        plan,
      },
      subscription_data: {
        metadata: {
          tenantId: tenant._id.toString(),
          tenantSlug: tenant.slug,
          plan,
        },
      },
    });

    if (!session.url) {
      throw new AppError('Stripe no devolvió URL de checkout', 502);
    }

    return { url: session.url, sessionId: session.id };
  }

  static async createPortalSession(tenant: ITenant): Promise<{ url: string }> {
    if (!tenant.stripeCustomerId) {
      throw new AppError('Este restaurante no tiene suscripción Stripe activa', 400);
    }

    const stripe = assertStripe();
    const base = env.webAdminUrl.replace(/\/$/, '');
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${base}/settings`,
    });

    return { url: session.url };
  }

  static async applyPlanUpdate(
    tenantId: string,
    plan: TenantPlan,
    data: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      stripeSubscriptionStatus?: string;
    }
  ): Promise<void> {
    const update: Record<string, unknown> = { plan };
    if (data.stripeCustomerId) update.stripeCustomerId = data.stripeCustomerId;
    if (data.stripeSubscriptionId !== undefined) {
      update.stripeSubscriptionId = data.stripeSubscriptionId;
    }
    if (data.stripeSubscriptionStatus !== undefined) {
      update.stripeSubscriptionStatus = data.stripeSubscriptionStatus;
    }
    await Tenant.findByIdAndUpdate(tenantId, update);
  }

  static async downgradeToStarter(tenantId: string): Promise<void> {
    await Tenant.findByIdAndUpdate(tenantId, {
      plan: 'starter',
      stripeSubscriptionId: '',
      stripeSubscriptionStatus: 'canceled',
    });
  }

  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await StripeSaasService.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await StripeSaasService.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await StripeSaasService.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  }

  private static async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    const planMeta = session.metadata?.plan;
    if (!tenantId || !planMeta || !isOnboardingPlan(planMeta)) {
      console.warn('[Stripe Webhook] checkout.session.completed sin metadata tenant/plan');
      return;
    }

    await StripeSaasService.applyPlanUpdate(tenantId, planMeta, {
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      stripeSubscriptionId:
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? '',
      stripeSubscriptionStatus: 'active',
    });

    console.log(`[Stripe Webhook] Plan ${planMeta} activado tenant ${tenantId}`);
  }

  private static async onSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) return;

    const priceId = subscription.items.data[0]?.price?.id;
    const planFromPrice = priceId ? resolvePlanFromPriceId(priceId) : null;
    const planFromMeta = subscription.metadata?.plan;
    const plan =
      planFromPrice ??
      (planFromMeta && isOnboardingPlan(planFromMeta) ? planFromMeta : null);

    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      await StripeSaasService.downgradeToStarter(tenantId);
      console.log(`[Stripe Webhook] Suscripción ${subscription.status} — tenant ${tenantId} → starter`);
      return;
    }

    if (!plan) {
      console.warn('[Stripe Webhook] subscription.updated sin plan reconocido', tenantId);
      return;
    }

    await StripeSaasService.applyPlanUpdate(tenantId, plan, {
      stripeCustomerId:
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
    });

    console.log(`[Stripe Webhook] Suscripción actualizada tenant ${tenantId} plan=${plan}`);
  }

  private static async onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) return;

    await StripeSaasService.downgradeToStarter(tenantId);
    console.log(`[Stripe Webhook] Suscripción eliminada — tenant ${tenantId} → starter`);
  }

  static constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const stripe = assertStripe();
    if (!env.stripeWebhookSecret) {
      throw new AppError('STRIPE_WEBHOOK_SECRET no configurado', 503);
    }
    return stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
  }
}
