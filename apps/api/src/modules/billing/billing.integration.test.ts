import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../create-app.js';
import { DEMO_TENANT, getDemoContext, loginStaff } from '../../test/helpers.js';
import { skipIfNoDb } from '../../test/integration-setup.js';

const app = createApp();

describe('API integración — facturación demo', () => {
  it('emite factura B en modo demo para pedido entregado', async (ctx) => {
    skipIfNoDb(ctx);
    const { tableId, menuItemId } = await getDemoContext(app);
    const adminToken = await loginStaff(app, 'admin@bistro-digital.app', 'admin123');

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
    const orderId = createRes.body.data.id as string;

    const kitchenToken = await loginStaff(app, 'cocina@bistro-digital.app', 'cocina123');
    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ status: 'delivered' });

    const invoiceRes = await request(app)
      .post(`/api/v1/billing/${orderId}/invoice`)
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ invoiceType: 'B' });

    expect(invoiceRes.status).toBe(201);
    expect(invoiceRes.body.error).toBeNull();
    expect(invoiceRes.body.data.mode).toBe('demo');
    expect(invoiceRes.body.data.cae).toMatch(/^\d{14}$/);
    expect(invoiceRes.body.data.invoiceType).toBe('B');

    const pdfRes = await request(app)
      .get(`/api/v1/billing/${orderId}/invoice/pdf`)
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.text).toContain('CAE');
  });

  it('rechaza facturar pedido pendiente', async (ctx) => {
    skipIfNoDb(ctx);
    const { tableId, menuItemId } = await getDemoContext(app);
    const adminToken = await loginStaff(app, 'admin@bistro-digital.app', 'admin123');

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

    const orderId = createRes.body.data.id as string;

    const invoiceRes = await request(app)
      .post(`/api/v1/billing/${orderId}/invoice`)
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ invoiceType: 'B' });

    expect(invoiceRes.status).toBe(400);
    expect(invoiceRes.body.error).toMatch(/pagado o entregado/i);
  });
});
