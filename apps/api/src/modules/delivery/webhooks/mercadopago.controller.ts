import type { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../../../config/env.js';
import { TenantService } from '../../tenant/tenant.service.js';
import { OrderService } from '../../orders/order.service.js';
import { MercadoPagoService } from '../../payments/mercadopago.service.js';

function verifyWebhookSignature(req: Request): boolean {
  if (!env.mercadopagoWebhookSecret) return true;

  const xSignature = req.headers['x-signature'] as string | undefined;
  const xRequestId = req.headers['x-request-id'] as string | undefined;
  if (!xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key.trim(), value.trim()];
    })
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const dataId =
    (req.query['data.id'] as string | undefined) ??
    (req.body as { data?: { id?: string } })?.data?.id ??
    (req.query.id as string | undefined) ??
    '';

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedHash = crypto
    .createHmac('sha256', env.mercadopagoWebhookSecret)
    .update(manifest)
    .digest('hex');

  return expectedHash === receivedHash;
}

function extractPaymentId(req: Request): string | null {
  const body = req.body as {
    data?: { id?: string | number };
    id?: string | number;
  };

  const fromBody = body.data?.id ?? body.id;
  if (fromBody != null) return String(fromBody);

  const fromQuery = req.query.id ?? req.query['data.id'];
  if (typeof fromQuery === 'string') return fromQuery;

  return null;
}

export const mercadopagoWebhook = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ status: 'ok' });

  try {
    if (!verifyWebhookSignature(req)) {
      console.warn('[MercadoPago Webhook] Firma inválida');
      return;
    }

    const tenantId = req.query.tenantId;
    if (typeof tenantId !== 'string') {
      console.warn('[MercadoPago Webhook] tenantId no proporcionado');
      return;
    }

    const tenant = await TenantService.findById(tenantId);
    if (!tenant) {
      console.warn('[MercadoPago Webhook] Tenant no encontrado:', tenantId);
      return;
    }

    const paymentId = extractPaymentId(req);
    if (!paymentId) {
      console.warn('[MercadoPago Webhook] paymentId no encontrado en payload');
      return;
    }

    const payment = await MercadoPagoService.getPayment(paymentId, tenant);
    const orderId = payment.external_reference;
    if (!orderId) {
      console.warn('[MercadoPago Webhook] external_reference vacío');
      return;
    }

    if (payment.status === 'approved') {
      await OrderService.confirmMercadoPagoPayment(
        tenant._id.toString(),
        orderId,
        String(payment.id)
      );
      console.log(`[MercadoPago Webhook] Pago aprobado pedido ${orderId}`);
      return;
    }

    if (['rejected', 'cancelled', 'refunded'].includes(payment.status ?? '')) {
      await OrderService.failMercadoPagoPayment(tenant._id.toString(), orderId);
      console.log(`[MercadoPago Webhook] Pago fallido pedido ${orderId}: ${payment.status}`);
    }
  } catch (err) {
    console.error('[MercadoPago Webhook] Error:', err);
  }
};
