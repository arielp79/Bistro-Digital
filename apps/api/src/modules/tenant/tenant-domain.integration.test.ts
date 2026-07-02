import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { skipIfNoDb } from '../../test/integration-setup.js';
import { Tenant } from '../tenant/tenant.model.js';

const app = createApp();
const DEMO_SLUG = 'bistro-digital';
const CUSTOM_DOMAIN = 'e2e-custom-menu.test';

describe('API integración — dominio custom tenant', () => {
  it('GET /tenant/resolve por subdominio devuelve slug y config', async (ctx) => {
    skipIfNoDb(ctx);

    const res = await request(app).get('/api/v1/tenant/resolve?host=bistro-digital.local');

    expect(res.status).toBe(200);
    expect(res.body.data.slug).toBe(DEMO_SLUG);
    expect(res.body.data.config.name).toBeTruthy();
  });

  it('GET /tenant/resolve por dominio custom configurado', async (ctx) => {
    skipIfNoDb(ctx);

    const tenant = await Tenant.findOne({ slug: DEMO_SLUG, deletedAt: null });
    expect(tenant).toBeTruthy();

    const previousDomain = tenant!.domain;
    await Tenant.findByIdAndUpdate(tenant!._id, { $set: { domain: CUSTOM_DOMAIN } });

    try {
      const res = await request(app).get(`/api/v1/tenant/resolve?host=${CUSTOM_DOMAIN}`);

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe(DEMO_SLUG);
    } finally {
      await Tenant.findByIdAndUpdate(tenant!._id, { $set: { domain: previousDomain } });
    }
  });

  it('GET /tenant/config resuelve tenant por header Host custom', async (ctx) => {
    skipIfNoDb(ctx);

    const tenant = await Tenant.findOne({ slug: DEMO_SLUG, deletedAt: null });
    expect(tenant).toBeTruthy();

    const previousDomain = tenant!.domain;
    await Tenant.findByIdAndUpdate(tenant!._id, { $set: { domain: CUSTOM_DOMAIN } });

    try {
      const res = await request(app)
        .get('/api/v1/tenant/config')
        .set('Host', CUSTOM_DOMAIN);

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe(DEMO_SLUG);
    } finally {
      await Tenant.findByIdAndUpdate(tenant!._id, { $set: { domain: previousDomain } });
    }
  });
});
