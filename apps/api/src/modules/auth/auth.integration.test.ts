import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { DEMO_TENANT, loginStaff } from '../../test/helpers.js';
import { skipIfNoDb } from '../../test/integration-setup.js';

const app = createApp();

describe('API integración — auth multi-tenant', () => {
  it('login staff demo devuelve tokens', async (ctx) => {
    skipIfNoDb(ctx);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Tenant-ID', DEMO_TENANT)
      .send({ email: 'admin@bistro-digital.app', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    expect(res.body.data.tokens.refreshToken).toBeTruthy();
  });

  it('rechaza acceso con token de otro tenant', async (ctx) => {
    skipIfNoDb(ctx);
    const token = await loginStaff(app, 'admin@bistro-digital.app', 'admin123');

    const res = await request(app)
      .get('/api/v1/tables')
      .set('X-Tenant-ID', 'otro-restaurante-inexistente')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
