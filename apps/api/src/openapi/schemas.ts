/** Schemas OpenAPI alineados con @bistro/shared-types y validation-schemas. */

const localizedText = {
  type: 'object',
  required: ['es', 'en', 'pt'],
  properties: {
    es: { type: 'string' },
    en: { type: 'string' },
    pt: { type: 'string' },
  },
} as const;

export const domainSchemas = {
  ApiMeta: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1 },
      total: { type: 'integer', minimum: 0 },
    },
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'admin@bistro-digital.app' },
      password: { type: 'string', minLength: 6, example: 'admin123' },
    },
  },

  AuthTokens: {
    type: 'object',
    required: ['accessToken', 'refreshToken'],
    properties: {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
    },
  },

  AuthUser: {
    type: 'object',
    required: ['id', 'email', 'name', 'role', 'tenantId'],
    properties: {
      id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      role: { $ref: '#/components/schemas/UserRole' },
      tenantId: { type: 'string', nullable: true },
    },
  },

  LoginResponse: {
    type: 'object',
    required: ['user', 'tokens'],
    properties: {
      user: { $ref: '#/components/schemas/AuthUser' },
      tokens: { $ref: '#/components/schemas/AuthTokens' },
    },
  },

  ImpersonationInfo: {
    type: 'object',
    required: ['auditLogId', 'platformAdminId', 'platformAdminEmail', 'tenantSlug', 'tenantName'],
    properties: {
      auditLogId: { type: 'string' },
      platformAdminId: { type: 'string' },
      platformAdminEmail: { type: 'string', format: 'email' },
      tenantSlug: { type: 'string' },
      tenantName: { type: 'string' },
    },
  },

  ImpersonationAuditLog: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      platformAdminId: { type: 'string' },
      platformAdminEmail: { type: 'string', format: 'email' },
      tenantId: { type: 'string' },
      tenantSlug: { type: 'string' },
      tenantName: { type: 'string' },
      targetAdminId: { type: 'string' },
      targetAdminEmail: { type: 'string', format: 'email' },
      ipAddress: { type: 'string', nullable: true },
      userAgent: { type: 'string', nullable: true },
      startedAt: { type: 'string', format: 'date-time' },
      endedAt: { type: 'string', format: 'date-time', nullable: true },
      durationSeconds: { type: 'integer', nullable: true },
    },
  },

  ImpersonateResponse: {
    allOf: [
      { $ref: '#/components/schemas/LoginResponse' },
      {
        type: 'object',
        required: ['tenant', 'impersonation'],
        properties: {
          tenant: {
            type: 'object',
            required: ['slug', 'name'],
            properties: { slug: { type: 'string' }, name: { type: 'string' } },
          },
          impersonation: { $ref: '#/components/schemas/ImpersonationInfo' },
        },
      },
    ],
  },

  TenantBranding: {
    type: 'object',
    required: ['logoUrl', 'primaryColor', 'accentColor', 'fontFamily', 'theme'],
    properties: {
      logoUrl: { type: 'string' },
      primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
      accentColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
      fontFamily: { type: 'string' },
      theme: { type: 'string', enum: ['light', 'dark'] },
    },
  },

  TenantConfigPublic: {
    type: 'object',
    required: ['slug', 'name', 'branding', 'languages', 'defaultLanguage', 'currency', 'timezone', 'paymentMethods'],
    properties: {
      slug: { type: 'string', example: 'bistro-digital' },
      name: { type: 'string', example: 'Bistró Digital' },
      branding: { $ref: '#/components/schemas/TenantBranding' },
      languages: { type: 'array', items: { type: 'string' } },
      defaultLanguage: { type: 'string', enum: ['es', 'en', 'pt'] },
      currency: { type: 'string', enum: ['ARS', 'USD', 'BRL'] },
      timezone: { type: 'string' },
      paymentMethods: {
        type: 'object',
        properties: {
          cash: { type: 'boolean' },
          transfer: { type: 'boolean' },
          mercadopago: { type: 'boolean' },
          stripe: { type: 'boolean' },
        },
      },
    },
  },

  TenantDomainSettings: {
    type: 'object',
    required: ['domain', 'defaultSubdomain', 'isCustomDomain', 'clientUrl', 'dnsCnameTarget'],
    properties: {
      domain: { type: 'string', example: 'bistro-digital.local' },
      defaultSubdomain: { type: 'string', example: 'bistro-digital.saas-base.com' },
      isCustomDomain: { type: 'boolean' },
      clientUrl: { type: 'string', example: 'http://localhost:5173/?tenant=bistro-digital' },
      dnsCnameTarget: { type: 'string', nullable: true, example: 'proxy.saas-base.com' },
    },
  },

  TenantResolveResponse: {
    type: 'object',
    required: ['slug', 'config'],
    properties: {
      slug: { type: 'string' },
      config: { $ref: '#/components/schemas/TenantConfigPublic' },
    },
  },

  TenantConfigUpdate: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      domain: { type: 'string', description: 'Dominio custom (ej. menu.mirestaurante.com)' },
      branding: { $ref: '#/components/schemas/TenantBranding', description: 'Campos parciales' },
      defaultLanguage: { type: 'string', enum: ['es', 'en', 'pt'] },
      paymentMethods: {
        type: 'object',
        properties: {
          cash: { type: 'boolean' },
          transfer: { type: 'boolean' },
          mercadopago: { type: 'boolean' },
          stripe: { type: 'boolean' },
        },
      },
      integrations: {
        type: 'object',
        properties: {
          mercadopagoAccessToken: { type: 'string' },
          whatsappPhoneNumberId: { type: 'string' },
          whatsappAccessToken: { type: 'string' },
          whatsappWebhookToken: { type: 'string' },
          instagramPageId: { type: 'string' },
          instagramAccessToken: { type: 'string' },
        },
      },
      afip: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          cuit: { type: 'string' },
          pointOfSale: { type: 'integer', minimum: 1 },
          certificate: { type: 'string', description: 'PEM del certificado' },
          privateKey: { type: 'string', description: 'PEM de la clave privada' },
        },
      },
    },
  },

  MetaIntegrationStatus: {
    type: 'object',
    properties: {
      metaAppReady: { type: 'boolean' },
      whatsappConnected: { type: 'boolean' },
      instagramConnected: { type: 'boolean' },
      deliveryReady: { type: 'boolean' },
    },
  },

  PilotReadinessStatus: {
    type: 'object',
    properties: {
      overallPercent: { type: 'integer' },
      publicApiReady: { type: 'boolean' },
      aiConfigured: { type: 'boolean' },
      aiProvider: { type: 'string', enum: ['gemini', 'openai'], nullable: true },
      metaWhatsApp: { type: 'boolean' },
      metaInstagram: { type: 'boolean' },
      afipConfigured: { type: 'boolean' },
      afipEnabled: { type: 'boolean' },
    },
  },

  AfipTestResult: {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      environment: { type: 'string', enum: ['homologacion', 'produccion'] },
      cuit: { type: 'string' },
      pointOfSale: { type: 'integer' },
      lastVoucherB: { type: 'integer' },
      message: { type: 'string' },
    },
  },

  TenantWebhookInfo: {
    type: 'object',
    properties: {
      whatsappUrl: { type: 'string', format: 'uri' },
      instagramUrl: { type: 'string', format: 'uri' },
      metaVerifyToken: { type: 'string' },
      publicApiUrl: { type: 'string', format: 'uri' },
      tunnelRequired: { type: 'boolean' },
      signatureVerification: { type: 'boolean' },
    },
  },

  TenantAdminSettings: {
    allOf: [
      { $ref: '#/components/schemas/TenantConfigPublic' },
      {
        type: 'object',
        required: [
          'plan',
          'saasBilling',
          'domainSettings',
          'integrations',
          'webhooks',
          'metaStatus',
          'afip',
          'pilotStatus',
        ],
        properties: {
          plan: { $ref: '#/components/schemas/TenantPlan' },
          saasBilling: { $ref: '#/components/schemas/SaasBillingStatus' },
          domainSettings: { $ref: '#/components/schemas/TenantDomainSettings' },
          integrations: {
            type: 'object',
            properties: {
              mercadopagoConfigured: { type: 'boolean' },
              whatsappConfigured: { type: 'boolean' },
              whatsappPhoneNumberId: { type: 'string' },
              whatsappWebhookToken: { type: 'string' },
              instagramConfigured: { type: 'boolean' },
              instagramPageId: { type: 'string' },
            },
          },
          webhooks: { $ref: '#/components/schemas/TenantWebhookInfo' },
          metaStatus: { $ref: '#/components/schemas/MetaIntegrationStatus' },
          afip: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              cuit: { type: 'string' },
              pointOfSale: { type: 'integer' },
              certificateConfigured: { type: 'boolean' },
              privateKeyConfigured: { type: 'boolean' },
            },
          },
          pilotStatus: { $ref: '#/components/schemas/PilotReadinessStatus' },
        },
      },
    ],
  },

  SlugAvailability: {
    type: 'object',
    required: ['available', 'slug'],
    properties: {
      available: { type: 'boolean' },
      slug: { type: 'string' },
      reason: { type: 'string' },
    },
  },

  OnboardingRegisterRequest: {
    type: 'object',
    required: ['restaurantName', 'adminEmail', 'adminPassword', 'adminName'],
    properties: {
      restaurantName: { type: 'string', minLength: 2, maxLength: 80 },
      slug: { type: 'string', minLength: 3, maxLength: 48, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
      primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', default: '#1A1A2E' },
      accentColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', default: '#E8C468' },
      defaultLanguage: { type: 'string', enum: ['es', 'en', 'pt'], default: 'es' },
      currency: { type: 'string', enum: ['ARS', 'USD', 'BRL'], default: 'ARS' },
      plan: { $ref: '#/components/schemas/TenantPlan', default: 'starter' },
      adminEmail: { type: 'string', format: 'email' },
      adminPassword: { type: 'string', minLength: 6 },
      adminName: { type: 'string', minLength: 1 },
      includeStarterMenu: { type: 'boolean', default: true },
      tableCount: { type: 'integer', minimum: 1, maximum: 20, default: 4 },
    },
  },

  OnboardingPlanBilling: {
    type: 'object',
    required: ['requiresPayment', 'checkoutAvailable'],
    properties: {
      requiresPayment: { type: 'boolean' },
      checkoutAvailable: { type: 'boolean' },
    },
  },

  OnboardingPlanOption: {
    type: 'object',
    required: ['id', 'name', 'description', 'priceLabel', 'features'],
    properties: {
      id: { $ref: '#/components/schemas/TenantPlan' },
      name: { type: 'string' },
      description: { type: 'string' },
      priceLabel: { type: 'string' },
      features: { type: 'array', items: { type: 'string' } },
      recommended: { type: 'boolean' },
      billing: { $ref: '#/components/schemas/OnboardingPlanBilling' },
    },
  },

  OnboardingPlansResponse: {
    type: 'object',
    required: ['stripeConfigured', 'plans'],
    properties: {
      stripeConfigured: { type: 'boolean' },
      plans: {
        type: 'array',
        items: { $ref: '#/components/schemas/OnboardingPlanOption' },
      },
    },
  },

  OnboardingRegisterBilling: {
    type: 'object',
    required: ['requestedPlan', 'checkoutRequired'],
    properties: {
      requestedPlan: { $ref: '#/components/schemas/TenantPlan' },
      checkoutRequired: { type: 'boolean' },
    },
  },

  SaasBillingStatus: {
    type: 'object',
    required: [
      'plan',
      'stripeConfigured',
      'subscriptionStatus',
      'subscriptionActive',
      'canCheckout',
      'canManagePortal',
      'publishableKey',
    ],
    properties: {
      plan: { $ref: '#/components/schemas/TenantPlan' },
      stripeConfigured: { type: 'boolean' },
      subscriptionStatus: { type: 'string', nullable: true },
      subscriptionActive: { type: 'boolean' },
      canCheckout: { type: 'boolean' },
      canManagePortal: { type: 'boolean' },
      publishableKey: { type: 'string', nullable: true },
    },
  },

  StripeCheckoutSession: {
    type: 'object',
    required: ['url', 'sessionId'],
    properties: {
      url: { type: 'string', format: 'uri' },
      sessionId: { type: 'string' },
    },
  },

  SaasCheckoutRequest: {
    type: 'object',
    required: ['plan'],
    properties: {
      plan: { type: 'string', enum: ['pro', 'enterprise'] },
    },
  },

  StripePortalSession: {
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string', format: 'uri' },
    },
  },

  OnboardingWelcomeEmailStatus: {
    type: 'object',
    properties: {
      sent: { type: 'boolean' },
      mode: { type: 'string', enum: ['console', 'resend', 'disabled'] },
      error: { type: 'string' },
    },
  },

  OnboardingRegisterResponse: {
    type: 'object',
    required: ['tenant', 'user', 'tokens', 'welcomeEmail', 'urls', 'billing'],
    properties: {
      tenant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          name: { type: 'string' },
          plan: { $ref: '#/components/schemas/TenantPlan' },
        },
      },
      billing: { $ref: '#/components/schemas/OnboardingRegisterBilling' },
      user: { $ref: '#/components/schemas/AuthUser' },
      tokens: { $ref: '#/components/schemas/AuthTokens' },
      welcomeEmail: { $ref: '#/components/schemas/OnboardingWelcomeEmailStatus' },
      urls: {
        type: 'object',
        properties: {
          admin: { type: 'string', format: 'uri' },
          clientMenu: { type: 'string', format: 'uri' },
          connectMeta: { type: 'string', format: 'uri' },
          login: { type: 'string', format: 'uri' },
        },
      },
    },
  },

  MenuItemPublic: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      categoryId: { type: 'string' },
      sku: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      imageUrl: { type: 'string' },
      basePrice: { type: 'number', minimum: 0 },
      isAvailable: { type: 'boolean' },
      preparationTimeMinutes: { type: 'integer' },
      tags: { type: 'array', items: { type: 'string' } },
      modifierGroups: { type: 'array', items: { type: 'object' } },
      sortOrder: { type: 'integer' },
    },
  },

  MenuCategoryWithItems: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      sortOrder: { type: 'integer' },
      items: { type: 'array', items: { $ref: '#/components/schemas/MenuItemPublic' } },
    },
  },

  MenuResponse: {
    type: 'object',
    required: ['lang', 'currency', 'categories'],
    properties: {
      lang: { type: 'string', enum: ['es', 'en', 'pt'] },
      currency: { type: 'string', enum: ['ARS', 'USD', 'BRL'] },
      categories: { type: 'array', items: { $ref: '#/components/schemas/MenuCategoryWithItems' } },
    },
  },

  CreateCategoryRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: localizedText,
      sortOrder: { type: 'integer', minimum: 0, default: 0 },
      isActive: { type: 'boolean', default: true },
    },
  },

  CreateMenuItemRequest: {
    type: 'object',
    required: ['categoryId', 'sku', 'name', 'description', 'basePrice'],
    properties: {
      categoryId: { type: 'string' },
      sku: { type: 'string' },
      name: localizedText,
      description: localizedText,
      imageUrl: { type: 'string' },
      basePrice: { type: 'number', minimum: 0 },
      isAvailable: { type: 'boolean', default: true },
      preparationTimeMinutes: { type: 'integer', minimum: 0, default: 15 },
      tags: { type: 'array', items: { type: 'string' } },
      sortOrder: { type: 'integer', minimum: 0, default: 0 },
    },
  },

  CreateOrderItemInput: {
    type: 'object',
    required: ['menuItemId', 'quantity'],
    properties: {
      menuItemId: { type: 'string' },
      quantity: { type: 'integer', minimum: 1, maximum: 99 },
      selectedModifiers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['groupId', 'optionId'],
          properties: { groupId: { type: 'string' }, optionId: { type: 'string' } },
        },
      },
      notes: { type: 'string', maxLength: 500 },
    },
  },

  CreateOrderRequest: {
    type: 'object',
    required: ['items', 'paymentMethod'],
    properties: {
      type: { $ref: '#/components/schemas/OrderType', default: 'dine-in' },
      source: { $ref: '#/components/schemas/OrderSource', default: 'qr' },
      tableId: { type: 'string' },
      items: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/components/schemas/CreateOrderItemInput' },
      },
      tip: { type: 'number', minimum: 0, default: 0 },
      deliveryFee: { type: 'number', minimum: 0 },
      paymentMethod: { $ref: '#/components/schemas/PaymentMethod' },
      customer: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
        },
      },
    },
  },

  OrderPublic: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      orderNumber: { type: 'string', example: 'B-0042' },
      type: { $ref: '#/components/schemas/OrderType' },
      source: { $ref: '#/components/schemas/OrderSource' },
      status: { $ref: '#/components/schemas/OrderStatus' },
      tableId: { type: 'string', nullable: true },
      tableLabel: { type: 'string', nullable: true },
      items: { type: 'array', items: { type: 'object' } },
      subtotal: { type: 'number' },
      discounts: { type: 'number' },
      tip: { type: 'number' },
      deliveryFee: { type: 'number' },
      total: { type: 'number' },
      payment: {
        type: 'object',
        properties: {
          method: { $ref: '#/components/schemas/PaymentMethod', nullable: true },
          status: { type: 'string', enum: ['pending', 'verified', 'failed'] },
        },
      },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  OrderStatusResponse: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      orderNumber: { type: 'string' },
      type: { $ref: '#/components/schemas/OrderType' },
      status: { $ref: '#/components/schemas/OrderStatus' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quantity: { type: 'integer' },
            status: { type: 'string' },
          },
        },
      },
      payment: { type: 'object' },
      deliveryFee: { type: 'number' },
      customerAddress: { type: 'string', nullable: true },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  UpdateOrderStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: { status: { $ref: '#/components/schemas/OrderStatus' } },
  },

  TablePublic: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      number: { type: 'integer' },
      label: { type: 'string' },
      zone: { type: 'string' },
      status: { $ref: '#/components/schemas/TableStatus' },
      capacity: { type: 'integer' },
      currentOrderId: { type: 'string', nullable: true },
      qrCodeUrl: { type: 'string', format: 'uri' },
    },
  },

  CreateTableRequest: {
    type: 'object',
    required: ['number', 'label'],
    properties: {
      number: { type: 'integer', minimum: 1 },
      label: { type: 'string', minLength: 1 },
      zone: { type: 'string', default: 'Salón' },
      capacity: { type: 'integer', minimum: 1, default: 4 },
    },
  },

  UpdateTableStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: { status: { $ref: '#/components/schemas/TableStatus' } },
  },

  Ingredient: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      unit: { type: 'string', enum: ['g', 'ml', 'unit', 'kg', 'l'] },
      currentStock: { type: 'number' },
      minimumStock: { type: 'number' },
      costPerUnit: { type: 'number' },
      supplier: { type: 'string' },
      isLowStock: { type: 'boolean' },
    },
  },

  CreateIngredientRequest: {
    type: 'object',
    required: ['name', 'unit'],
    properties: {
      name: { type: 'string', minLength: 1 },
      unit: { type: 'string', enum: ['g', 'ml', 'unit', 'kg', 'l'] },
      currentStock: { type: 'number', minimum: 0, default: 0 },
      minimumStock: { type: 'number', minimum: 0, default: 0 },
      costPerUnit: { type: 'number', minimum: 0, default: 0 },
      supplier: { type: 'string', default: '' },
    },
  },

  StockMovementRequest: {
    type: 'object',
    required: ['ingredientId', 'type', 'quantity'],
    properties: {
      ingredientId: { type: 'string' },
      type: { type: 'string', enum: ['restock', 'consumption', 'adjustment', 'waste'] },
      quantity: { type: 'number', description: 'Positivo entrada, negativo salida' },
      notes: { type: 'string', maxLength: 500 },
    },
  },

  SalesAnalytics: {
    type: 'object',
    properties: {
      revenue: {
        type: 'object',
        properties: {
          today: { type: 'number' },
          thisWeek: { type: 'number' },
          thisMonth: { type: 'number' },
          byDay: {
            type: 'array',
            items: {
              type: 'object',
              properties: { date: { type: 'string', format: 'date' }, amount: { type: 'number' } },
            },
          },
        },
      },
      orders: { type: 'object' },
      topItems: { type: 'array', items: { type: 'object' } },
      peakHours: { type: 'array', items: { type: 'object' } },
    },
  },

  UserPublic: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      role: { $ref: '#/components/schemas/UserRole' },
      phone: { type: 'string' },
      isActive: { type: 'boolean' },
      lastLogin: { type: 'string', format: 'date-time', nullable: true },
    },
  },

  CreateUserRequest: {
    type: 'object',
    required: ['email', 'password', 'name', 'role'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      name: { type: 'string', minLength: 1 },
      role: { type: 'string', enum: ['admin', 'waiter', 'kitchen', 'cashier'] },
      phone: { type: 'string', default: '' },
    },
  },

  ShippingCalculation: {
    type: 'object',
    properties: {
      distanceKm: { type: 'number' },
      fee: { type: 'number', nullable: true },
      estimatedMinutes: { type: 'integer' },
      isDeliverable: { type: 'boolean' },
      calculationMethod: { type: 'string', enum: ['haversine', 'google_maps'] },
    },
  },

  SimulateDeliveryRequest: {
    type: 'object',
    required: ['phone', 'message'],
    properties: {
      phone: { type: 'string', minLength: 8 },
      message: { type: 'string', minLength: 1 },
    },
  },

  DeliveryOpsSnapshot: {
    type: 'object',
    properties: {
      redisAvailable: { type: 'boolean' },
      workerRunning: { type: 'boolean' },
      counts: {
        type: 'object',
        properties: {
          waiting: { type: 'integer' },
          active: { type: 'integer' },
          completed: { type: 'integer' },
          failed: { type: 'integer' },
          delayed: { type: 'integer' },
        },
      },
      latencyMs: {
        type: 'object',
        properties: {
          avg: { type: 'number', nullable: true },
          p95: { type: 'number', nullable: true },
          sampleSize: { type: 'integer' },
        },
      },
      failedJobs: { type: 'array', items: { type: 'object' } },
      recentJobs: { type: 'array', items: { type: 'object' } },
      lastUpdated: { type: 'string', format: 'date-time' },
    },
  },

  MercadoPagoPreferenceResponse: {
    type: 'object',
    properties: {
      preferenceId: { type: 'string' },
      initPoint: { type: 'string', format: 'uri' },
      sandboxInitPoint: { type: 'string', format: 'uri', nullable: true },
    },
  },

  CreateInvoiceRequest: {
    type: 'object',
    properties: { invoiceType: { type: 'string', enum: ['B', 'C'], default: 'B' } },
  },

  InvoicePublic: {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
      orderNumber: { type: 'string' },
      invoiceType: { type: 'string', enum: ['B', 'C'] },
      cae: { type: 'string' },
      caeExpiry: { type: 'string' },
      voucherNumber: { type: 'integer' },
      pointOfSale: { type: 'integer' },
      mode: { type: 'string', enum: ['production', 'homologacion', 'demo'] },
      pdfUrl: { type: 'string', format: 'uri' },
    },
  },

  PlatformMetrics: {
    type: 'object',
    properties: {
      tenants: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          active: { type: 'integer' },
          inactive: { type: 'integer' },
          byPlan: {
            type: 'object',
            properties: {
              starter: { type: 'integer' },
              pro: { type: 'integer' },
              enterprise: { type: 'integer' },
            },
          },
        },
      },
      orders: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          paidThisMonth: { type: 'integer' },
          revenueThisMonth: { type: 'number' },
        },
      },
      users: { type: 'object', properties: { total: { type: 'integer' } } },
    },
  },

  PlatformTenantSummary: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      slug: { type: 'string' },
      name: { type: 'string' },
      plan: { $ref: '#/components/schemas/TenantPlan' },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      stats: {
        type: 'object',
        properties: {
          users: { type: 'integer' },
          orders: { type: 'integer' },
          revenueThisMonth: { type: 'number' },
        },
      },
    },
  },

  PlatformTenantDetail: {
    allOf: [
      { $ref: '#/components/schemas/PlatformTenantSummary' },
      {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          updatedAt: { type: 'string', format: 'date-time' },
          metaStatus: { $ref: '#/components/schemas/MetaIntegrationStatus' },
          integrations: { type: 'object' },
          admins: { type: 'array', items: { type: 'object' } },
          stats: { type: 'object' },
          urls: {
            type: 'object',
            properties: {
              clientBase: { type: 'string', format: 'uri' },
              adminLogin: { type: 'string', format: 'uri' },
            },
          },
        },
      },
    ],
  },

  PlatformE2eCleanupResult: {
    type: 'object',
    properties: {
      deletedTenants: { type: 'integer' },
      deletedSlugs: { type: 'array', items: { type: 'string' } },
    },
  },

  TenantStatusPatch: {
    type: 'object',
    required: ['isActive'],
    properties: { isActive: { type: 'boolean' } },
  },

  TenantPlanPatch: {
    type: 'object',
    required: ['plan'],
    properties: { plan: { $ref: '#/components/schemas/TenantPlan' } },
  },
};

export const enumSchemas = {
  UserRole: {
    type: 'string',
    enum: ['admin', 'waiter', 'kitchen', 'cashier', 'platform_admin'],
  },
  TenantPlan: {
    type: 'string',
    enum: ['starter', 'pro', 'enterprise'],
  },
  OrderStatus: {
    type: 'string',
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'paid'],
  },
  OrderType: {
    type: 'string',
    enum: ['dine-in', 'delivery', 'takeaway'],
  },
  OrderSource: {
    type: 'string',
    enum: ['qr', 'waiter', 'whatsapp', 'instagram', 'manual'],
  },
  TableStatus: {
    type: 'string',
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
  },
  PaymentMethod: {
    type: 'string',
    enum: ['cash', 'transfer', 'mercadopago', 'stripe'],
  },
};

export const openApiSchemas = {
  ...enumSchemas,
  ...domainSchemas,
};
