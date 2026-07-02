import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { DEMO_TENANT, getDemoContext, loginStaff } from '../../test/helpers.js';
import { skipIfNoDb } from '../../test/integration-setup.js';

const app = createApp();

describe('API integración — pedidos', () => {
  it('GET /health responde ok', async (ctx) => {
    skipIfNoDb(ctx);
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('flujo: crear pedido QR → listar en cocina', async (ctx) => {
    skipIfNoDb(ctx);
    const { tableId, menuItemId } = await getDemoContext(app);

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('X-Tenant-ID', DEMO_TENANT)
      .send({
        type: 'dine-in',
        source: 'qr',
        tableId,
        paymentMethod: 'cash',
        tip: 0,
        items: [{ menuItemId, quantity: 1, selectedModifiers: [] }],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.error).toBeNull();
    const orderId = createRes.body.data.id as string;
    const orderNumber = createRes.body.data.orderNumber as string;

    const kitchenToken = await loginStaff(app, 'cocina@bistro-digital.app', 'cocina123');
    const listRes = await request(app)
      .get('/api/v1/orders?status=pending,confirmed,preparing,ready')
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${kitchenToken}`);

    expect(listRes.status).toBe(200);
    const ids = (listRes.body.data as Array<{ id: string }>).map((o) => o.id);
    expect(ids).toContain(orderId);

    const statusRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ status: 'confirmed' });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('confirmed');
    expect(statusRes.body.data.orderNumber).toBe(orderNumber);
  });
});
