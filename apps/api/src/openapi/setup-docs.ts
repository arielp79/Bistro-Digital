import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env.js';
import { buildOpenApiSpec } from './spec.js';

let cachedSpec: ReturnType<typeof buildOpenApiSpec> | null = null;

export function getOpenApiSpec() {
  if (!cachedSpec) {
    cachedSpec = buildOpenApiSpec();
  }
  return cachedSpec;
}

export function setupApiDocs(app: Express): void {
  if (!env.apiDocsEnabled) return;

  const spec = getOpenApiSpec();

  app.get('/api/v1/openapi.json', (_req, res) => {
    res.json(spec);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'Bistró Digital API',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    })
  );
}
