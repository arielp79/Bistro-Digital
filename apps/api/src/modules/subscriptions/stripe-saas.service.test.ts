import { describe, it, expect, vi } from 'vitest';

vi.mock('../../config/env.js', () => ({
  env: {
    stripeSecretKey: 'sk_test',
    stripeWebhookSecret: 'whsec_test',
    stripePublishableKey: 'pk_test',
    stripePricePro: 'price_pro_test',
    stripePriceEnterprise: 'price_ent_test',
    webAdminUrl: 'http://localhost:3001',
  },
}));

import {
  resolvePlanFromPriceId,
  resolvePriceIdForPlan,
} from './stripe-saas.service.js';

describe('StripeSaasService plan mapping', () => {
  it('resuelve price id por plan', () => {
    expect(resolvePriceIdForPlan('starter')).toBeNull();
    expect(resolvePriceIdForPlan('pro')).toBe('price_pro_test');
    expect(resolvePriceIdForPlan('enterprise')).toBe('price_ent_test');
  });

  it('resuelve plan desde price id de Stripe', () => {
    expect(resolvePlanFromPriceId('price_pro_test')).toBe('pro');
    expect(resolvePlanFromPriceId('price_ent_test')).toBe('enterprise');
    expect(resolvePlanFromPriceId('price_unknown')).toBeNull();
  });
});
