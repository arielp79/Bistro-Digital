import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { DEMO_TENANT, loginStaff } from '../../test/helpers.js';
import { skipIfNoDb } from '../../test/integration-setup.js';

const app = createApp();

describe('API integración — billing SaaS Stripe', () => {
  it('GET /subscriptions/plans responde con planes enriquecidos', async (ctx) => {
    skipIfNoDb(ctx);
    const res = await request(app).get('/api/v1/subscriptions/plans');
    expect(res.status).toBe(200);
    expect(res.body.data.plans).toHaveLength(3);
    expect(res.body.data.plans[0].id).toBe('starter');
  });

  it('POST /subscriptions/checkout sin Stripe devuelve 503', async (ctx) => {
    skipIfNoDb(ctx);
    if (process.env.STRIPE_SECRET_KEY) {
      ctx.skip();
      return;
    }
    const token = await loginStaff(app, 'admin@bistro-digital.app', 'admin123');
    const res = await request(app)
      .post('/api/v1/subscriptions/checkout')
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro' });

    expect(res.status).toBe(503);
  });
});
