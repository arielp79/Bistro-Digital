import { env } from '../config/env.js';
import {
  bearerSecurity,
  openApiComponents,
  tenantBearerSecurity,
  tenantSecurity,
} from './components.js';
import { examples } from './examples.js';
import { apiDataArrayResponse, apiDataResponse, apiErrorResponse, requestBody } from './helpers.js';

type Paths = Record<string, Record<string, unknown>>;

const S = '#/components/schemas';

export function buildOpenApiSpec() {
  const serverUrl = env.apiUrl.replace(/\/$/, '');

  const paths: Paths = {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API operativa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'bistro-api' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Auth ──────────────────────────────────────────────────────────
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login staff del restaurante',
        description: 'Requiere `X-Tenant-ID` con el slug del restaurante.',
        security: tenantSecurity,
        requestBody: requestBody(`${S}/LoginRequest`, { example: examples.loginRequest }),
        responses: {
          '200': apiDataResponse(`${S}/LoginResponse`, 'Login exitoso', examples.loginResponse),
          '401': apiErrorResponse('Credenciales inválidas', 'Email o contraseña incorrectos'),
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renovar access token',
        description: 'Refresh token en cookie httpOnly `refreshToken` o body `{ refreshToken }`.',
        responses: {
          '200': apiDataResponse(`${S}/AuthTokens`, 'Nuevos tokens'),
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Usuario autenticado',
        security: bearerSecurity,
        responses: {
          '200': apiDataResponse(`${S}/AuthUser`, 'Perfil del usuario'),
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Tenant ──────────────────────────────────────────────────────────
    '/api/v1/tenant/resolve': {
      get: {
        tags: ['Tenant'],
        summary: 'Resolver tenant por Host (dominio custom o subdominio)',
        description: 'Público. Usado por web-client cuando el hostname no es subdominio de plataforma.',
        parameters: [
          {
            name: 'host',
            in: 'query',
            schema: { type: 'string', example: 'bistro-digital.local' },
            description: 'Hostname (default: header Host de la petición)',
          },
        ],
        responses: {
          '200': apiDataResponse(
            `${S}/TenantResolveResponse`,
            'Slug y config pública',
            examples.tenantResolveResponse
          ),
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/tenant/config': {
      get: {
        tags: ['Tenant'],
        summary: 'Config pública white-label',
        security: tenantSecurity,
        responses: {
          '200': apiDataResponse(
            `${S}/TenantConfigPublic`,
            'Branding, idiomas, pagos',
            examples.tenantConfigResponse
          ),
        },
      },
      patch: {
        tags: ['Tenant'],
        summary: 'Actualizar config del restaurante',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/TenantConfigUpdate`),
        responses: {
          '200': apiDataResponse(`${S}/TenantAdminSettings`, 'Config actualizada'),
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/v1/tenant/settings': {
      get: {
        tags: ['Tenant'],
        summary: 'Config admin (integraciones, webhooks, dominio)',
        security: tenantBearerSecurity,
        responses: {
          '200': apiDataResponse(`${S}/TenantAdminSettings`, 'Settings completos'),
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ── Onboarding ─────────────────────────────────────────────────────
    '/api/v1/onboarding/plans': {
      get: {
        tags: ['Onboarding'],
        summary: 'Listar planes disponibles para alta',
        responses: {
          '200': apiDataArrayResponse(`${S}/OnboardingPlanOption`, 'Planes starter/pro/enterprise'),
        },
      },
    },
    '/api/v1/onboarding/check-slug': {
      get: {
        tags: ['Onboarding'],
        summary: 'Verificar disponibilidad de slug',
        parameters: [
          { name: 'slug', in: 'query', required: true, schema: { type: 'string', example: 'parrilla-del-sur' } },
        ],
        responses: {
          '200': apiDataResponse(
            `${S}/SlugAvailability`,
            'Disponibilidad del slug',
            examples.slugAvailabilityResponse
          ),
        },
      },
    },
    '/api/v1/onboarding/suggest-slug': {
      get: {
        tags: ['Onboarding'],
        summary: 'Sugerir slug desde nombre',
        parameters: [
          { name: 'name', in: 'query', required: true, schema: { type: 'string', example: 'Parrilla del Sur' } },
        ],
        responses: {
          '200': apiDataResponse(`${S}/SlugAvailability`, 'Slug sugerido'),
        },
      },
    },
    '/api/v1/onboarding/register': {
      post: {
        tags: ['Onboarding'],
        summary: 'Registrar nuevo restaurante',
        requestBody: requestBody(`${S}/OnboardingRegisterRequest`, {
          example: examples.onboardingRegisterRequest,
        }),
        responses: {
          '201': apiDataResponse(`${S}/OnboardingRegisterResponse`, 'Tenant + admin + tokens'),
          '409': apiErrorResponse('Slug no disponible', 'Ya está en uso'),
        },
      },
    },

    // ── Menú ───────────────────────────────────────────────────────────
    '/api/v1/menu': {
      get: {
        tags: ['Menú'],
        summary: 'Menú público (cliente QR)',
        security: tenantSecurity,
        parameters: [{ $ref: '#/components/parameters/Lang' }],
        responses: { '200': apiDataResponse(`${S}/MenuResponse`, 'Categorías e ítems') },
      },
    },
    '/api/v1/menu/categories': {
      get: {
        tags: ['Menú'],
        summary: 'Listar categorías (admin)',
        security: tenantBearerSecurity,
        responses: { '200': apiDataResponse(`${S}/MenuCategoryWithItems`, 'Categorías') },
      },
      post: {
        tags: ['Menú'],
        summary: 'Crear categoría',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/CreateCategoryRequest`),
        responses: { '201': apiDataResponse(`${S}/MenuCategoryWithItems`, 'Categoría creada') },
      },
    },
    '/api/v1/menu/categories/{id}': {
      patch: {
        tags: ['Menú'],
        summary: 'Actualizar categoría',
        security: tenantBearerSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: requestBody(`${S}/CreateCategoryRequest`, { required: false }),
        responses: { '200': apiDataResponse(`${S}/MenuCategoryWithItems`, 'Categoría actualizada') },
      },
      delete: {
        tags: ['Menú'],
        summary: 'Eliminar categoría',
        security: tenantBearerSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': apiDataResponse(`${S}/MenuCategoryWithItems`, 'Eliminada') },
      },
    },
    '/api/v1/menu/items': {
      get: {
        tags: ['Menú'],
        summary: 'Listar ítems (admin)',
        security: tenantBearerSecurity,
        responses: {
          '200': apiDataArrayResponse(`${S}/MenuItemPublic`, 'Ítems del menú'),
        },
      },
      post: {
        tags: ['Menú'],
        summary: 'Crear ítem',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/CreateMenuItemRequest`),
        responses: { '201': apiDataResponse(`${S}/MenuItemPublic`, 'Ítem creado') },
      },
    },
    '/api/v1/menu/items/{id}': {
      get: {
        tags: ['Menú'],
        summary: 'Detalle de ítem',
        security: tenantBearerSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': apiDataResponse(`${S}/MenuItemPublic`, 'Ítem') },
      },
      patch: {
        tags: ['Menú'],
        summary: 'Actualizar ítem',
        security: tenantBearerSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: requestBody(`${S}/CreateMenuItemRequest`, { required: false }),
        responses: { '200': apiDataResponse(`${S}/MenuItemPublic`, 'Ítem actualizado') },
      },
      delete: {
        tags: ['Menú'],
        summary: 'Eliminar ítem',
        security: tenantBearerSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': apiDataResponse(`${S}/MenuItemPublic`, 'Eliminado') },
      },
    },

    // ── Pedidos ────────────────────────────────────────────────────────
    '/api/v1/orders': {
      post: {
        tags: ['Pedidos'],
        summary: 'Crear pedido (cliente QR / público)',
        security: tenantSecurity,
        requestBody: requestBody(`${S}/CreateOrderRequest`, { example: examples.createOrderRequest }),
        responses: {
          '201': apiDataResponse(`${S}/OrderPublic`, 'Pedido creado', examples.orderResponse),
        },
      },
      get: {
        tags: ['Pedidos'],
        summary: 'Listar pedidos (staff)',
        security: tenantBearerSecurity,
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', description: 'CSV: pending,preparing,...' },
          },
        ],
        responses: {
          '200': apiDataArrayResponse(`${S}/OrderPublic`, 'Lista de pedidos'),
        },
      },
    },
    '/api/v1/orders/{orderId}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Detalle de pedido',
        security: tenantSecurity,
        parameters: [{ $ref: '#/components/parameters/OrderId' }],
        responses: { '200': apiDataResponse(`${S}/OrderPublic`, 'Pedido', examples.orderResponse) },
      },
    },
    '/api/v1/orders/{orderId}/status': {
      get: {
        tags: ['Pedidos'],
        summary: 'Estado del pedido (polling cliente)',
        security: tenantSecurity,
        parameters: [{ $ref: '#/components/parameters/OrderId' }],
        responses: { '200': apiDataResponse(`${S}/OrderStatusResponse`, 'Estado y timestamps') },
      },
      patch: {
        tags: ['Pedidos'],
        summary: 'Actualizar estado (cocina/caja)',
        security: tenantBearerSecurity,
        parameters: [{ $ref: '#/components/parameters/OrderId' }],
        requestBody: requestBody(`${S}/UpdateOrderStatusRequest`),
        responses: { '200': apiDataResponse(`${S}/OrderPublic`, 'Estado actualizado') },
      },
    },
    '/api/v1/orders/{orderId}/close': {
      post: {
        tags: ['Pedidos'],
        summary: 'Cerrar mesa / solicitar factura',
        security: tenantBearerSecurity,
        parameters: [{ $ref: '#/components/parameters/OrderId' }],
        responses: { '200': apiDataResponse(`${S}/OrderPublic`, 'Pedido cerrado') },
      },
    },

    // ── Mesas ──────────────────────────────────────────────────────────
    '/api/v1/tables': {
      get: {
        tags: ['Mesas'],
        summary: 'Listar mesas',
        security: tenantBearerSecurity,
        responses: { '200': apiDataArrayResponse(`${S}/TablePublic`, 'Mesas con estado') },
      },
      post: {
        tags: ['Mesas'],
        summary: 'Crear mesa',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/CreateTableRequest`),
        responses: { '201': apiDataResponse(`${S}/TablePublic`, 'Mesa creada') },
      },
    },
    '/api/v1/tables/{tableId}': {
      get: {
        tags: ['Mesas'],
        summary: 'Detalle de mesa',
        security: tenantSecurity,
        parameters: [{ $ref: '#/components/parameters/TableId' }],
        responses: { '200': apiDataResponse(`${S}/TablePublic`, 'Mesa') },
      },
      patch: {
        tags: ['Mesas'],
        summary: 'Actualizar mesa',
        security: tenantBearerSecurity,
        parameters: [{ $ref: '#/components/parameters/TableId' }],
        requestBody: requestBody(`${S}/CreateTableRequest`, { required: false }),
        responses: { '200': apiDataResponse(`${S}/TablePublic`, 'Mesa actualizada') },
      },
      delete: {
        tags: ['Mesas'],
        summary: 'Eliminar mesa',
        security: tenantBearerSecurity,
        parameters: [{ $ref: '#/components/parameters/TableId' }],
        responses: { '200': apiDataResponse(`${S}/TablePublic`, 'Eliminada') },
      },
    },
    '/api/v1/tables/{tableId}/status': {
      patch: {
        tags: ['Mesas'],
        summary: 'Cambiar estado de mesa',
        security: tenantBearerSecurity,
        parameters: [{ $ref: '#/components/parameters/TableId' }],
        requestBody: requestBody(`${S}/UpdateTableStatusRequest`),
        responses: { '200': apiDataResponse(`${S}/TablePublic`, 'Estado actualizado') },
      },
    },

    // ── Stock ──────────────────────────────────────────────────────────
    '/api/v1/stock/ingredients': {
      get: {
        tags: ['Stock'],
        summary: 'Listar ingredientes',
        security: tenantBearerSecurity,
        responses: { '200': apiDataArrayResponse(`${S}/Ingredient`, 'Ingredientes') },
      },
      post: {
        tags: ['Stock'],
        summary: 'Crear ingrediente',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/CreateIngredientRequest`),
        responses: { '201': apiDataResponse(`${S}/Ingredient`, 'Ingrediente creado') },
      },
    },
    '/api/v1/stock/ingredients/{id}': {
      patch: {
        tags: ['Stock'],
        summary: 'Actualizar ingrediente',
        security: tenantBearerSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: requestBody(`${S}/CreateIngredientRequest`, { required: false }),
        responses: { '200': apiDataResponse(`${S}/Ingredient`, 'Actualizado') },
      },
    },
    '/api/v1/stock/alerts': {
      get: {
        tags: ['Stock'],
        summary: 'Ingredientes bajo mínimo',
        security: tenantBearerSecurity,
        responses: { '200': apiDataArrayResponse(`${S}/Ingredient`, 'Alertas de stock') },
      },
    },
    '/api/v1/stock/movements': {
      post: {
        tags: ['Stock'],
        summary: 'Registrar movimiento manual',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/StockMovementRequest`),
        responses: { '201': apiDataResponse(`${S}/StockMovementRequest`, 'Movimiento registrado') },
      },
    },

    // ── Analytics ──────────────────────────────────────────────────────
    '/api/v1/analytics/sales': {
      get: {
        tags: ['Analytics'],
        summary: 'Métricas de ventas',
        security: tenantBearerSecurity,
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': apiDataResponse(`${S}/SalesAnalytics`, 'SalesAnalytics') },
      },
    },
    '/api/v1/analytics/items/top': {
      get: {
        tags: ['Analytics'],
        summary: 'Ítems más vendidos',
        security: tenantBearerSecurity,
        responses: { '200': apiDataArrayResponse(`${S}/MenuItemPublic`, 'Top ítems') },
      },
    },

    // ── Usuarios ───────────────────────────────────────────────────────
    '/api/v1/users': {
      get: {
        tags: ['Usuarios'],
        summary: 'Listar staff',
        security: tenantBearerSecurity,
        responses: { '200': apiDataArrayResponse(`${S}/UserPublic`, 'Usuarios') },
      },
      post: {
        tags: ['Usuarios'],
        summary: 'Crear usuario staff',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/CreateUserRequest`),
        responses: { '201': apiDataResponse(`${S}/UserPublic`, 'Usuario creado') },
      },
    },
    '/api/v1/users/{id}': {
      patch: {
        tags: ['Usuarios'],
        summary: 'Actualizar usuario',
        security: tenantBearerSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: requestBody(`${S}/CreateUserRequest`, { required: false }),
        responses: { '200': apiDataResponse(`${S}/UserPublic`, 'Usuario actualizado') },
      },
    },

    // ── Delivery ───────────────────────────────────────────────────────
    '/api/v1/delivery/shipping': {
      get: {
        tags: ['Delivery'],
        summary: 'Calcular costo de envío',
        security: tenantSecurity,
        parameters: [
          { name: 'address', in: 'query', schema: { type: 'string' } },
          { name: 'lat', in: 'query', schema: { type: 'number' } },
          { name: 'lng', in: 'query', schema: { type: 'number' } },
        ],
        responses: { '200': apiDataResponse(`${S}/ShippingCalculation`, 'Tarifa y distancia') },
      },
    },
    '/api/v1/delivery/simulate': {
      post: {
        tags: ['Delivery'],
        summary: 'Simular mensaje WhatsApp/Instagram (admin)',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/SimulateDeliveryRequest`),
        responses: { '200': apiDataResponse(`${S}/DeliveryOpsSnapshot`, 'Job encolado') },
      },
    },
    '/api/v1/delivery/sessions': {
      get: {
        tags: ['Delivery'],
        summary: 'Listar sesiones conversacionales',
        security: tenantBearerSecurity,
        responses: { '200': apiDataArrayResponse(`${S}/DeliveryOpsSnapshot`, 'Sesiones') },
      },
    },
    '/api/v1/delivery/sessions/{sessionId}': {
      get: {
        tags: ['Delivery'],
        summary: 'Detalle de sesión delivery',
        security: tenantBearerSecurity,
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': apiDataResponse(`${S}/DeliveryOpsSnapshot`, 'Sesión') },
      },
    },
    '/api/v1/delivery/ops': {
      get: {
        tags: ['Delivery'],
        summary: 'Observabilidad cola BullMQ',
        security: tenantBearerSecurity,
        responses: {
          '200': apiDataResponse(
            `${S}/DeliveryOpsSnapshot`,
            'DeliveryOpsSnapshot',
            examples.deliveryOpsResponse
          ),
        },
      },
    },
    '/api/v1/delivery/whatsapp/test': {
      post: {
        tags: ['Delivery'],
        summary: 'Enviar mensaje de prueba WhatsApp',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/SimulateDeliveryRequest`),
        responses: { '200': apiDataResponse(`${S}/ShippingCalculation`, 'Enviado') },
      },
    },
    '/api/v1/delivery/instagram/test': {
      post: {
        tags: ['Delivery'],
        summary: 'Enviar mensaje de prueba Instagram',
        security: tenantBearerSecurity,
        requestBody: requestBody(`${S}/SimulateDeliveryRequest`),
        responses: { '200': apiDataResponse(`${S}/ShippingCalculation`, 'Enviado') },
      },
    },

    // ── Pagos ──────────────────────────────────────────────────────────
    '/api/v1/payments/mercadopago/preference': {
      get: {
        tags: ['Pagos'],
        summary: 'Crear preferencia MercadoPago',
        security: tenantSecurity,
        parameters: [{ name: 'orderId', in: 'query', required: true, schema: { type: 'string' } }],
        responses: {
          '200': apiDataResponse(`${S}/MercadoPagoPreferenceResponse`, 'URL de checkout MP'),
        },
      },
      post: {
        tags: ['Pagos'],
        summary: 'Crear preferencia MercadoPago (POST)',
        security: tenantSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderId'],
                properties: { orderId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': apiDataResponse(`${S}/MercadoPagoPreferenceResponse`, 'URL de checkout MP'),
        },
      },
    },

    // ── Facturación ────────────────────────────────────────────────────
    '/api/v1/billing/orders': {
      get: {
        tags: ['Facturación'],
        summary: 'Pedidos facturables',
        security: tenantBearerSecurity,
        responses: { '200': apiDataArrayResponse(`${S}/InvoicePublic`, 'Pedidos listos para facturar') },
      },
    },
    '/api/v1/billing/afip/test': {
      post: {
        tags: ['Facturación'],
        summary: 'Probar conexión AFIP (homologación o producción)',
        security: tenantBearerSecurity,
        responses: { '200': apiDataResponse(`${S}/AfipTestResult`, 'Conexión AFIP validada') },
      },
    },
    '/api/v1/billing/{orderId}/invoice': {
      post: {
        tags: ['Facturación'],
        summary: 'Emitir factura AFIP',
        security: tenantBearerSecurity,
        parameters: [{ $ref: '#/components/parameters/OrderId' }],
        requestBody: requestBody(`${S}/CreateInvoiceRequest`, { required: false }),
        responses: { '200': apiDataResponse(`${S}/InvoicePublic`, 'CAE y PDF') },
      },
    },
    '/api/v1/billing/{orderId}/invoice/pdf': {
      get: {
        tags: ['Facturación'],
        summary: 'Descargar PDF de factura',
        security: tenantBearerSecurity,
        parameters: [{ $ref: '#/components/parameters/OrderId' }],
        responses: {
          '200': { description: 'PDF binario', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
        },
      },
    },

    // ── Platform (super-admin) ─────────────────────────────────────────
    '/api/v1/platform/auth/login': {
      post: {
        tags: ['Platform'],
        summary: 'Login super-admin SaaS',
        description: 'Sin header `X-Tenant-ID`. Rol resultante: `platform_admin`.',
        requestBody: requestBody(`${S}/LoginRequest`, { example: examples.platformLoginRequest }),
        responses: {
          '200': apiDataResponse(`${S}/LoginResponse`, 'platform_admin + tokens', examples.loginResponse),
        },
      },
    },
    '/api/v1/platform/metrics': {
      get: {
        tags: ['Platform'],
        summary: 'Métricas globales de la plataforma',
        security: bearerSecurity,
        responses: {
          '200': apiDataResponse(
            `${S}/PlatformMetrics`,
            'PlatformMetrics',
            examples.platformMetricsResponse
          ),
        },
      },
    },
    '/api/v1/platform/tenants': {
      get: {
        tags: ['Platform'],
        summary: 'Listar restaurantes',
        security: bearerSecurity,
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'plan', in: 'query', schema: { $ref: `${S}/TenantPlan` } },
          { name: 'includeInactive', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': apiDataArrayResponse(
            `${S}/PlatformTenantSummary`,
            'Lista paginada de tenants',
            examples.platformTenantsResponse
          ),
        },
      },
    },
    '/api/v1/platform/tenants/e2e-cleanup': {
      delete: {
        tags: ['Platform'],
        summary: 'Eliminar tenants e2e-* y sus datos',
        security: bearerSecurity,
        responses: {
          '200': apiDataResponse(`${S}/PlatformE2eCleanupResult`, 'Resultado de limpieza'),
        },
      },
    },
    '/api/v1/platform/tenants/{tenantId}': {
      get: {
        tags: ['Platform'],
        summary: 'Detalle de restaurante',
        security: bearerSecurity,
        parameters: [{ $ref: '#/components/parameters/TenantId' }],
        responses: { '200': apiDataResponse(`${S}/PlatformTenantDetail`, 'PlatformTenantDetail') },
      },
    },
    '/api/v1/platform/tenants/{tenantId}/status': {
      patch: {
        tags: ['Platform'],
        summary: 'Activar o suspender restaurante',
        security: bearerSecurity,
        parameters: [{ $ref: '#/components/parameters/TenantId' }],
        requestBody: requestBody(`${S}/TenantStatusPatch`),
        responses: { '200': apiDataResponse(`${S}/PlatformTenantSummary`, 'Tenant actualizado') },
      },
    },
    '/api/v1/platform/tenants/{tenantId}/plan': {
      patch: {
        tags: ['Platform'],
        summary: 'Cambiar plan del restaurante',
        security: bearerSecurity,
        parameters: [{ $ref: '#/components/parameters/TenantId' }],
        requestBody: requestBody(`${S}/TenantPlanPatch`),
        responses: { '200': apiDataResponse(`${S}/PlatformTenantSummary`, 'Plan actualizado') },
      },
    },
    '/api/v1/platform/tenants/{tenantId}/impersonate': {
      post: {
        tags: ['Platform'],
        summary: 'Impersonar admin del restaurante',
        description: 'Devuelve JWT del admin del tenant con claim `impersonatedBy`. Registra audit log.',
        security: bearerSecurity,
        parameters: [{ $ref: '#/components/parameters/TenantId' }],
        responses: {
          '200': apiDataResponse(
            `${S}/ImpersonateResponse`,
            'Tokens de admin + impersonation',
            examples.impersonateResponse
          ),
        },
      },
    },
    '/api/v1/platform/impersonation-logs': {
      get: {
        tags: ['Platform'],
        summary: 'Listar audit log de impersonaciones',
        security: bearerSecurity,
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { name: 'tenantSlug', in: 'query', schema: { type: 'string' } },
          { name: 'tenantId', in: 'query', schema: { type: 'string' } },
          { name: 'platformAdminId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': apiDataArrayResponse(`${S}/ImpersonationAuditLog`, 'Registros paginados'),
        },
      },
    },
    '/api/v1/platform/impersonation-logs/{auditLogId}/end': {
      post: {
        tags: ['Platform'],
        summary: 'Finalizar sesión de impersonación',
        security: bearerSecurity,
        parameters: [
          { name: 'auditLogId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': apiDataResponse(`${S}/ImpersonationAuditLog`, 'Sesión cerrada en audit log'),
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ── Webhooks ───────────────────────────────────────────────────────
    '/api/v1/webhooks/whatsapp': {
      get: {
        tags: ['Webhooks'],
        summary: 'Verificación webhook WhatsApp (Meta)',
        parameters: [
          { name: 'tenant', in: 'query', schema: { type: 'string' } },
          { name: 'hub.mode', in: 'query', schema: { type: 'string' } },
          { name: 'hub.verify_token', in: 'query', schema: { type: 'string' } },
          { name: 'hub.challenge', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Challenge de Meta (text/plain)' } },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Recibir mensajes WhatsApp',
        responses: { '200': { description: 'Ack inmediato; procesamiento async vía BullMQ' } },
      },
    },
    '/api/v1/webhooks/instagram': {
      get: {
        tags: ['Webhooks'],
        summary: 'Verificación webhook Instagram',
        responses: { '200': { description: 'Challenge de Meta' } },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Recibir mensajes Instagram',
        responses: { '200': { description: 'Ack inmediato' } },
      },
    },
    '/api/v1/webhooks/mercadopago': {
      post: {
        tags: ['Webhooks'],
        summary: 'Notificación de pago MercadoPago',
        responses: { '200': { description: 'Procesado' } },
      },
    },
  };

  return {
    openapi: '3.0.3',
    info: {
      title: 'Bistró Digital API',
      version: '1.0.0',
      description: [
        'API REST multi-tenant para gestión de restaurantes (SaaS white-label).',
        '',
        '**Convenciones:**',
        '- Respuestas: `{ data, error, meta? }`',
        '- Multi-tenant: header `X-Tenant-ID` con slug (ej. `bistro-digital`) o resolución por Host',
        '- Auth staff: `POST /api/v1/auth/login` + Bearer JWT',
        '- Super-admin: `POST /api/v1/platform/auth/login` (sin tenant)',
        '',
        'Documentación interactiva: `/api/docs` · Spec JSON: `/api/v1/openapi.json`',
      ].join('\n'),
      contact: { name: 'Bistró Digital' },
    },
    servers: [{ url: serverUrl, description: env.nodeEnv }],
    tags: [
      { name: 'Sistema' },
      { name: 'Auth' },
      { name: 'Tenant' },
      { name: 'Onboarding' },
      { name: 'Menú' },
      { name: 'Pedidos' },
      { name: 'Mesas' },
      { name: 'Stock' },
      { name: 'Analytics' },
      { name: 'Usuarios' },
      { name: 'Delivery' },
      { name: 'Pagos' },
      { name: 'Facturación' },
      { name: 'Platform' },
      { name: 'Webhooks' },
    ],
    paths,
    components: openApiComponents,
  };
}
