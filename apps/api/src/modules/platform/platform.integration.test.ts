import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { skipIfNoDb } from '../../test/integration-setup.js';

const app = createApp();
const PLATFORM_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? 'platform@saas-base.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD ?? 'platform123';

async function loginPlatform(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/platform/auth/login')
    .send({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD });

  expect(res.status).toBe(200);
  return res.body.data.tokens.accessToken as string;
}

describe('API integración — platform super-admin', () => {
  it('login platform_admin devuelve tokens', async (ctx) => {
    skipIfNoDb(ctx);
    const res = await request(app)
      .post('/api/v1/platform/auth/login')
      .send({ email: PLATFORM_EMAIL, password: PLATFORM_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('platform_admin');
    expect(res.body.data.user.tenantId).toBeNull();
  });

  it('rechaza métricas sin platform_admin', async (ctx) => {
    skipIfNoDb(ctx);
    const res = await request(app).get('/api/v1/platform/metrics');
    expect(res.status).toBe(401);
  });

  it('lista tenants y métricas con platform_admin', async (ctx) => {
    skipIfNoDb(ctx);
    const token = await loginPlatform();

    const [metricsRes, tenantsRes] = await Promise.all([
      request(app).get('/api/v1/platform/metrics').set('Authorization', `Bearer ${token}`),
      request(app)
        .get('/api/v1/platform/tenants?includeInactive=true')
        .set('Authorization', `Bearer ${token}`),
    ]);

    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.data.tenants.total).toBeGreaterThanOrEqual(1);
    expect(tenantsRes.status).toBe(200);
    expect(Array.isArray(tenantsRes.body.data)).toBe(true);
  });

  it('detalle y cambio de plan de tenant demo', async (ctx) => {
    skipIfNoDb(ctx);
    const token = await loginPlatform();

    const listRes = await request(app)
      .get('/api/v1/platform/tenants?search=bistro-digital')
      .set('Authorization', `Bearer ${token}`);

    const tenantId = listRes.body.data[0]?.id as string;
    expect(tenantId).toBeTruthy();

    const detailRes = await request(app)
      .get(`/api/v1/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.slug).toBe('bistro-digital');
    expect(detailRes.body.data.admins.length).toBeGreaterThanOrEqual(1);

    const originalPlan = detailRes.body.data.plan as string;

    const patchRes = await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}/plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'enterprise' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.plan).toBe('enterprise');

    await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}/plan`)
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: originalPlan });
  });

  it('impersona admin de tenant demo, registra audit log y accede al panel', async (ctx) => {
    skipIfNoDb(ctx);
    const platformToken = await loginPlatform();

    const listRes = await request(app)
      .get('/api/v1/platform/tenants?search=bistro-digital')
      .set('Authorization', `Bearer ${platformToken}`);

    const tenantId = listRes.body.data[0]?.id as string;

    const impersonateRes = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/impersonate`)
      .set('Authorization', `Bearer ${platformToken}`);

    expect(impersonateRes.status).toBe(200);
    expect(impersonateRes.body.data.impersonation.tenantSlug).toBe('bistro-digital');
    expect(impersonateRes.body.data.impersonation.auditLogId).toBeTruthy();
    expect(impersonateRes.body.data.user.role).toBe('admin');

    const auditLogId = impersonateRes.body.data.impersonation.auditLogId as string;
    const adminToken = impersonateRes.body.data.tokens.accessToken as string;

    const settingsRes = await request(app)
      .get('/api/v1/tenant/settings')
      .set('X-Tenant-ID', 'bistro-digital')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.data.slug).toBe('bistro-digital');

    const platformDenied = await request(app)
      .get('/api/v1/platform/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(platformDenied.status).toBe(403);

    const logsRes = await request(app)
      .get('/api/v1/platform/impersonation-logs?tenantSlug=bistro-digital')
      .set('Authorization', `Bearer ${platformToken}`);

    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data.some((l: { id: string }) => l.id === auditLogId)).toBe(true);

    const endRes = await request(app)
      .post(`/api/v1/platform/impersonation-logs/${auditLogId}/end`)
      .set('Authorization', `Bearer ${platformToken}`);

    expect(endRes.status).toBe(200);
    expect(endRes.body.data.endedAt).toBeTruthy();
    expect(endRes.body.data.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it('rechaza platform routes con token de admin restaurante', async (ctx) => {
    skipIfNoDb(ctx);
    const { loginStaff } = await import('../../test/helpers.js');
    const adminToken = await loginStaff(app, 'admin@bistro-digital.app', 'admin123');

    const res = await request(app)
      .get('/api/v1/platform/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('soft-delete de tenant oculta restaurante y bloquea acceso', async (ctx) => {
    skipIfNoDb(ctx);
    const token = await loginPlatform();
    const slug = `soft-del-${Date.now()}`;
    const email = `admin-${slug}@e2e.test`;

    const registerRes = await request(app)
      .post('/api/v1/onboarding/register')
      .send({
        restaurantName: `Soft Delete ${slug}`,
        slug,
        plan: 'starter',
        adminName: 'Soft Del Admin',
        adminEmail: email,
        adminPassword: 'test123456',
        includeStarterMenu: false,
        tableCount: 1,
      });

    expect(registerRes.status).toBe(201);
    const tenantId = registerRes.body.data.tenant.id as string;

    const deleteRes = await request(app)
      .delete(`/api/v1/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.slug).toBe(slug);
    expect(deleteRes.body.data.deletedAt).toBeTruthy();

    const listRes = await request(app)
      .get(`/api/v1/platform/tenants?search=${slug}&includeInactive=true`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((t: { id: string }) => t.id === tenantId)).toBe(false);

    const configRes = await request(app)
      .get('/api/v1/tenant/config')
      .set('X-Tenant-ID', slug);

    expect(configRes.status).toBe(403);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Tenant-ID', slug)
      .send({ email, password: 'test123456' });

    expect(loginRes.status).toBe(403);
  });

  it('rechaza soft-delete del tenant demo bistro-digital', async (ctx) => {
    skipIfNoDb(ctx);
    const token = await loginPlatform();

    const listRes = await request(app)
      .get('/api/v1/platform/tenants?search=bistro-digital')
      .set('Authorization', `Bearer ${token}`);

    const tenantId = listRes.body.data[0]?.id as string;
    expect(tenantId).toBeTruthy();

    const deleteRes = await request(app)
      .delete(`/api/v1/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(403);
  });
});
