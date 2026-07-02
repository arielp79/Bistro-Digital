/** Componentes reutilizables de la spec OpenAPI. */

import { openApiSchemas } from './schemas.js';

export const openApiComponents = {
  securitySchemes: {
    bearerAuth: {
      type: 'http' as const,
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Access token JWT. Roles: admin, waiter, kitchen, cashier, platform_admin.',
    },
    tenantHeader: {
      type: 'apiKey' as const,
      in: 'header' as const,
      name: 'X-Tenant-ID',
      description: 'Slug o ObjectId del restaurante (ej. `bistro-digital`). Obligatorio en rutas multi-tenant.',
    },
  },
  schemas: {
    ApiResponse: {
      type: 'object',
      properties: {
        data: { nullable: true, description: 'Payload de éxito' },
        error: { type: 'string', nullable: true },
        meta: { $ref: '#/components/schemas/ApiMeta', nullable: true },
      },
      required: ['data', 'error'],
    },
    ...openApiSchemas,
  },
  parameters: {
    TenantHeader: {
      name: 'X-Tenant-ID',
      in: 'header',
      required: true,
      schema: { type: 'string', example: 'bistro-digital' },
    },
    OrderId: {
      name: 'orderId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
    TableId: {
      name: 'tableId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
    TenantId: {
      name: 'tenantId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
    Page: {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    Limit: {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
    Lang: {
      name: 'lang',
      in: 'query',
      schema: { type: 'string', enum: ['es', 'en', 'pt'], default: 'es' },
    },
  },
  responses: {
    Unauthorized: {
      description: 'No autenticado o token inválido',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiResponse' },
          example: { data: null, error: 'Token de acceso requerido' },
        },
      },
    },
    Forbidden: {
      description: 'Sin permisos o tenant inválido',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiResponse' },
          example: { data: null, error: 'Acceso denegado' },
        },
      },
    },
    NotFound: {
      description: 'Recurso no encontrado',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiResponse' },
          example: { data: null, error: 'No encontrado' },
        },
      },
    },
  },
};

export const tenantSecurity = [{ tenantHeader: [] as string[] }];
export const tenantBearerSecurity = [{ tenantHeader: [] as string[], bearerAuth: [] as string[] }];
export const bearerSecurity = [{ bearerAuth: [] as string[] }];
