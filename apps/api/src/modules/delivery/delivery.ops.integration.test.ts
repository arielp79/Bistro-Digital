import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { DEMO_TENANT, loginStaff } from '../../test/helpers.js';
import { skipIfNoDb } from '../../test/integration-setup.js';
import { DeliveryOpsService } from './delivery-ops.service.js';

vi.mock('./delivery-ops.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./delivery-ops.service.js')>();
  return {
    ...actual,
    DeliveryOpsService: {
      getSnapshot: vi.fn(),
    },
  };
});

const app = createApp();
const getSnapshot = vi.mocked(DeliveryOpsService.getSnapshot);

describe('API integración — delivery ops', () => {
  it('GET /delivery/ops devuelve snapshot para admin', async (ctx) => {
    skipIfNoDb(ctx);
    const adminToken = await loginStaff(app, 'admin@bistro-digital.app', 'admin123');

    getSnapshot.mockResolvedValue({
      redisAvailable: true,
      workerRunning: true,
      counts: { waiting: 1, active: 0, completed: 5, failed: 1, delayed: 0 },
      latencyMs: { avg: 420, p95: 900, sampleSize: 5 },
      failedJobs: [
        {
          id: 'job-99',
          platform: 'simulate',
          from: '5491112345678',
          messagePreview: 'hola',
          failedReason: 'OpenAI timeout',
          attemptsMade: 3,
          finishedAt: new Date().toISOString(),
        },
      ],
      recentJobs: [],
      lastUpdated: new Date().toISOString(),
    });

    const res = await request(app)
      .get('/api/v1/delivery/ops')
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.redisAvailable).toBe(true);
    expect(res.body.data.latencyMs.avg).toBe(420);
    expect(res.body.data.failedJobs).toHaveLength(1);
  });
});
