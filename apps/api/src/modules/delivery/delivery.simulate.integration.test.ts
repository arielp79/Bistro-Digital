import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { DEMO_TENANT, loginStaff } from '../../test/helpers.js';
import { skipIfNoDb } from '../../test/integration-setup.js';

const addMock = vi.fn().mockResolvedValue({ id: 'sim-job-1' });

vi.mock('../../services/queue.service.js', () => ({
  getDeliveryQueue: () => ({ add: addMock }),
  getQueueConnection: () => ({}),
}));

const app = createApp();

describe('API integración — delivery simulador', () => {
  beforeEach(() => {
    addMock.mockClear();
  });

  it('encola mensaje de simulación para admin', async (ctx) => {
    skipIfNoDb(ctx);
    const adminToken = await loginStaff(app, 'admin@bistro-digital.app', 'admin123');

    const res = await request(app)
      .post('/api/v1/delivery/simulate')
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        phone: '5491112345678',
        message: '2 empanadas de carne para delivery',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.jobId).toBe('sim-job-1');
    expect(addMock).toHaveBeenCalledOnce();
    expect(addMock.mock.calls[0]?.[1]).toMatchObject({
      platform: 'simulate',
      type: 'text',
      text: '2 empanadas de carne para delivery',
    });
  });
});
