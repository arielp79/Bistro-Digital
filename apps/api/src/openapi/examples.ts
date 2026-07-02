/** Ejemplos realistas alineados con el tenant demo `bistro-digital`. */

const demoBranding = {
  logoUrl: '',
  primaryColor: '#1A1A2E',
  accentColor: '#E8C468',
  fontFamily: 'Inter, system-ui, sans-serif',
  theme: 'light' as const,
};

const demoTenantConfig = {
  slug: 'bistro-digital',
  name: 'Bistró Digital',
  branding: demoBranding,
  languages: ['es', 'en', 'pt'],
  defaultLanguage: 'es',
  currency: 'ARS' as const,
  timezone: 'America/Argentina/Buenos_Aires',
  paymentMethods: { cash: true, transfer: true, mercadopago: true, stripe: false },
};

export const examples = {
  loginRequest: {
    email: 'admin@bistro-digital.app',
    password: 'admin123',
  },

  platformLoginRequest: {
    email: 'platform@saas-base.com',
    password: 'platform123',
  },

  loginResponse: {
    data: {
      user: {
        id: '674a1b2c3d4e5f6789012345',
        email: 'admin@bistro-digital.app',
        name: 'Admin Demo',
        role: 'admin',
        tenantId: '674a1b2c3d4e5f6789012340',
      },
      tokens: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
    error: null,
  },

  impersonateResponse: {
    data: {
      user: {
        id: '674a1b2c3d4e5f6789012345',
        email: 'admin@bistro-digital.app',
        name: 'Admin Demo',
        role: 'admin',
        tenantId: '674a1b2c3d4e5f6789012340',
      },
      tokens: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      tenant: { slug: 'bistro-digital', name: 'Bistró Digital' },
      impersonation: {
        auditLogId: '674a1b2c3d4e5f6789012999',
        platformAdminId: '674a1b2c3d4e5f6789012300',
        platformAdminEmail: 'platform@saas-base.com',
        tenantSlug: 'bistro-digital',
        tenantName: 'Bistró Digital',
      },
    },
    error: null,
  },

  tenantResolveResponse: {
    data: {
      slug: 'bistro-digital',
      config: demoTenantConfig,
    },
    error: null,
  },

  tenantConfigResponse: {
    data: demoTenantConfig,
    error: null,
  },

  createOrderRequest: {
    type: 'dine-in',
    source: 'qr',
    tableId: '674a1b2c3d4e5f6789012400',
    items: [
      {
        menuItemId: '674a1b2c3d4e5f6789012410',
        quantity: 2,
        selectedModifiers: [{ groupId: '674a1b2c3d4e5f6789012411', optionId: '674a1b2c3d4e5f6789012412' }],
        notes: 'Sin cebolla',
      },
    ],
    tip: 500,
    paymentMethod: 'cash',
  },

  orderResponse: {
    data: {
      id: '674a1b2c3d4e5f6789012500',
      orderNumber: 'B-0042',
      type: 'dine-in',
      source: 'qr',
      status: 'pending',
      tableId: '674a1b2c3d4e5f6789012400',
      tableLabel: 'Mesa 5',
      items: [
        {
          menuItemId: '674a1b2c3d4e5f6789012410',
          name: 'Hamburguesa clásica',
          quantity: 2,
          unitPrice: 4500,
          selectedModifiers: [{ groupName: 'Punto', optionName: 'Medio', priceAdjustment: 0 }],
          notes: 'Sin cebolla',
          status: 'pending',
        },
      ],
      subtotal: 9000,
      discounts: 0,
      tip: 500,
      deliveryFee: 0,
      total: 9500,
      payment: { method: 'cash', status: 'pending' },
      createdAt: '2026-06-26T12:00:00.000Z',
    },
    error: null,
  },

  platformMetricsResponse: {
    data: {
      tenants: { total: 12, active: 10, inactive: 2, byPlan: { starter: 8, pro: 3, enterprise: 1 } },
      orders: { total: 1540, paidThisMonth: 320, revenueThisMonth: 2850000 },
      users: { total: 48 },
    },
    error: null,
  },

  platformTenantsResponse: {
    data: [
      {
        id: '674a1b2c3d4e5f6789012340',
        slug: 'bistro-digital',
        name: 'Bistró Digital',
        plan: 'pro',
        isActive: true,
        createdAt: '2025-06-01T10:00:00.000Z',
        stats: { users: 5, orders: 420, revenueThisMonth: 890000 },
      },
    ],
    error: null,
    meta: { page: 1, limit: 20, total: 12 },
  },

  deliveryOpsResponse: {
    data: {
      redisAvailable: true,
      workerRunning: true,
      counts: { waiting: 0, active: 1, completed: 42, failed: 2, delayed: 0 },
      latencyMs: { avg: 1250, p95: 3200, sampleSize: 40 },
      failedJobs: [],
      recentJobs: [
        {
          id: 'job-abc123',
          platform: 'whatsapp',
          status: 'completed',
          durationMs: 980,
          finishedAt: '2026-06-26T11:55:00.000Z',
          messagePreview: 'Quiero 2 empanadas',
        },
      ],
      lastUpdated: '2026-06-26T12:00:00.000Z',
    },
    error: null,
  },

  onboardingRegisterRequest: {
    restaurantName: 'Parrilla del Sur',
    slug: 'parrilla-del-sur',
    primaryColor: '#1A1A2E',
    accentColor: '#E8C468',
    defaultLanguage: 'es',
    currency: 'ARS',
    plan: 'pro',
    adminEmail: 'admin@parrilla.com',
    adminPassword: 'parrilla123',
    adminName: 'Juan Pérez',
  },

  slugAvailabilityResponse: {
    data: { available: true, slug: 'parrilla-del-sur' },
    error: null,
  },
};
