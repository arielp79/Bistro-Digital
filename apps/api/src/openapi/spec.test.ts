import { describe, it, expect } from 'vitest';
import { buildOpenApiSpec } from './spec.js';
import { openApiSchemas } from './schemas.js';

describe('OpenAPI spec', () => {
  const spec = buildOpenApiSpec();

  it('tiene metadatos OpenAPI 3.0', () => {
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Bistró Digital API');
    expect(spec.servers?.length).toBeGreaterThan(0);
  });

  it('documenta rutas clave', () => {
    const paths = Object.keys(spec.paths);
    expect(paths).toContain('/api/v1/auth/login');
    expect(paths).toContain('/api/v1/tenant/resolve');
    expect(paths).toContain('/api/v1/orders');
    expect(paths).toContain('/api/v1/platform/tenants');
    expect(paths).toContain('/api/v1/platform/tenants/{tenantId}/impersonate');
    expect(paths).toContain('/api/v1/platform/impersonation-logs');
    expect(paths).toContain('/api/v1/delivery/ops');
    expect(paths).toContain('/api/v1/subscriptions/checkout');
    expect(paths).toContain('/api/v1/webhooks/stripe');
    expect(paths).toContain('/health');
  });

  it('define seguridad tenant y bearer', () => {
    expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
    expect(spec.components?.securitySchemes?.tenantHeader).toBeDefined();
  });

  it('incluye tags por módulo', () => {
    const tagNames = spec.tags?.map((t) => t.name) ?? [];
    expect(tagNames).toContain('Platform');
    expect(tagNames).toContain('Pedidos');
    expect(tagNames).toContain('Webhooks');
  });

  it('define schemas detallados de dominio', () => {
    const schemas = spec.components?.schemas ?? {};
    expect(schemas.LoginResponse).toBeDefined();
    expect(schemas.CreateOrderRequest).toBeDefined();
    expect(schemas.ImpersonateResponse).toBeDefined();
    expect(schemas.TenantAdminSettings).toBeDefined();
    expect(schemas.PlatformMetrics).toBeDefined();
    expect(schemas.DeliveryOpsSnapshot).toBeDefined();
    expect(Object.keys(openApiSchemas).length).toBeGreaterThanOrEqual(40);
  });

  it('login tiene requestBody y ejemplo de respuesta', () => {
    const login = spec.paths['/api/v1/auth/login']?.post as Record<string, unknown>;
    const requestBody = login?.requestBody as { content?: Record<string, unknown> };
    const responses = login?.responses as Record<string, { content?: Record<string, unknown> }>;
    expect(requestBody?.content?.['application/json']).toBeDefined();
    const res200 = responses?.['200'];
    const example = (res200?.content?.['application/json'] as { example?: unknown })?.example;
    expect(example).toBeDefined();
  });

  it('crear pedido documenta schema de request y response', () => {
    const create = spec.paths['/api/v1/orders']?.post as Record<string, unknown>;
    const requestBody = create?.requestBody as { content?: { 'application/json'?: { schema?: { $ref?: string } } } };
    expect(requestBody?.content?.['application/json']?.schema?.$ref).toContain('CreateOrderRequest');
  });

  it('impersonate documenta ImpersonateResponse', () => {
    const impersonate = spec.paths['/api/v1/platform/tenants/{tenantId}/impersonate']?.post as Record<string, unknown>;
    const responses = impersonate?.responses as Record<string, { content?: { 'application/json'?: { schema?: { properties?: { data?: { $ref?: string } } } } } }>;
    const dataRef = responses?.['200']?.content?.['application/json']?.schema?.properties?.data?.$ref;
    expect(dataRef).toContain('ImpersonateResponse');
  });
});
