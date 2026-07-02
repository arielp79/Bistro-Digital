import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../create-app.js';
import { DEMO_TENANT, getDemoContext, loginStaff } from '../../../test/helpers.js';
import { skipIfNoDb } from '../../../test/integration-setup.js';
import { MercadoPagoService } from '../../payments/mercadopago.service.js';
import { Tenant } from '../../tenant/tenant.model.js';

vi.mock('../../payments/mercadopago.service.js', () => ({
  MercadoPagoService: {
    getPayment: vi.fn(),
  },
}));

const app = createApp();
const getPayment = vi.mocked(MercadoPagoService.getPayment);

describe('API integración — webhook MercadoPago', () => {
  beforeEach(() => {
    getPayment.mockReset();
  });

  it('confirma pago y permite avanzar pedido MP en cocina', async (ctx) => {
    skipIfNoDb(ctx);
    const { tableId, menuItemId } = await getDemoContext(app);
    const tenant = await Tenant.findOne({ slug: DEMO_TENANT });
    if (!tenant) throw new Error('Tenant demo no encontrado');

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('X-Tenant-ID', DEMO_TENANT)
      .send({
        type: 'dine-in',
        source: 'qr',
        tableId,
        paymentMethod: 'mercadopago',
        tip: 0,
        items: [{ menuItemId, quantity: 1, selectedModifiers: [] }],
      });

    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.id as string;
    expect(createRes.body.data.payment.status).toBe('pending');

    const kitchenToken = await loginStaff(app, 'cocina@bistro-digital.app', 'cocina123');
    const blockedRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ status: 'confirmed' });

    expect(blockedRes.status).toBe(400);
    expect(blockedRes.body.error).toMatch(/MercadoPago/i);

    getPayment.mockResolvedValue({
      id: 12345,
      status: 'approved',
      external_reference: orderId,
    } as Awaited<ReturnType<typeof MercadoPagoService.getPayment>>);

    await request(app)
      .post(`/api/v1/webhooks/mercadopago?tenantId=${tenant._id.toString()}`)
      .send({ data: { id: '12345' } });

    await vi.waitFor(async () => {
      const statusRes = await request(app)
        .get(`/api/v1/orders/${orderId}/status`)
        .set('X-Tenant-ID', DEMO_TENANT);
      expect(statusRes.body.data.payment.status).toBe('verified');
    });

    const confirmRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('X-Tenant-ID', DEMO_TENANT)
      .set('Authorization', `Bearer ${kitchenToken}`)
      .send({ status: 'confirmed' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('confirmed');
  });
});
