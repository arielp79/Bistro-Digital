import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { skipIfNoDb } from '../../test/integration-setup.js';
import { Tenant } from '../tenant/tenant.model.js';
import { User } from '../auth/user.model.js';

const app = createApp();
const testSlug = `onb-test-${Date.now()}`;

describe('API integración — onboarding ampliado', () => {
  afterAll(async () => {
    const tenant = await Tenant.findOne({ slug: testSlug });
    if (!tenant) return;
    await User.deleteMany({ tenantId: tenant._id });
    await Tenant.findByIdAndDelete(tenant._id);
  });

  it('GET /onboarding/plans devuelve starter, pro y enterprise', async (ctx) => {
    skipIfNoDb(ctx);
    const res = await request(app).get('/api/v1/onboarding/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data.map((p: { id: string }) => p.id)).toContain('starter');
  });

  it('POST /onboarding/register asigna plan y envía welcome email (console)', async (ctx) => {
    skipIfNoDb(ctx);
    const res = await request(app)
      .post('/api/v1/onboarding/register')
      .send({
        restaurantName: `Onboarding Test ${testSlug}`,
        slug: testSlug,
        plan: 'pro',
        adminName: 'Test Admin',
        adminEmail: `admin-${testSlug}@e2e.test`,
        adminPassword: 'test123456',
        includeStarterMenu: false,
        tableCount: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.tenant.slug).toBe(testSlug);
    expect(res.body.data.tenant.plan).toBe('pro');
    expect(res.body.data.welcomeEmail.sent).toBe(true);
    expect(res.body.data.welcomeEmail.mode).toBe('console');
    expect(res.body.data.urls.login).toContain('login');
  });
});
