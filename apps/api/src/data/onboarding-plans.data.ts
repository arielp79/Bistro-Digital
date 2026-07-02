import type { OnboardingPlanOption, TenantPlan } from '@bistro/shared-types';

export const ONBOARDING_PLANS: OnboardingPlanOption[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal para probar el menú QR, mesas y panel básico.',
    priceLabel: 'Gratis',
    features: [
      'Menú digital QR',
      'Hasta 10 mesas',
      'Panel admin',
      'Pedidos en tiempo real',
    ],
    recommended: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Delivery IA, analytics y stock para restaurantes en crecimiento.',
    priceLabel: 'Próximamente',
    features: [
      'Todo Starter',
      'Delivery WhatsApp / Instagram',
      'Analytics de ventas',
      'Control de stock',
      'Dominio personalizado',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Multi-sucursal, AFIP producción y soporte prioritario.',
    priceLabel: 'Contactar ventas',
    features: [
      'Todo Pro',
      'AFIP producción',
      'Múltiples sucursales',
      'Soporte prioritario',
      'SLA dedicado',
    ],
  },
];

export function isOnboardingPlan(value: string): value is TenantPlan {
  return value === 'starter' || value === 'pro' || value === 'enterprise';
}
