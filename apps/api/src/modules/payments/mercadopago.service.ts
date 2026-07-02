import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import type { MercadoPagoPreferenceResponse } from '@bistro/shared-types';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/api-response.js';
import { decrypt } from '../../utils/encryption.js';
import type { ITenant } from '../tenant/tenant.model.js';
import type { IOrder } from '../orders/order.model.js';

function resolveAccessToken(tenant: ITenant): string {
  const tenantToken = tenant.config.mercadopago?.accessToken;
  if (tenantToken) {
    try {
      return decrypt(tenantToken);
    } catch {
      return tenantToken;
    }
  }

  if (env.mercadopagoAccessToken) {
    return env.mercadopagoAccessToken;
  }

  throw new AppError('MercadoPago no configurado para este restaurante', 503);
}

function getClient(tenant: ITenant): MercadoPagoConfig {
  return new MercadoPagoConfig({ accessToken: resolveAccessToken(tenant) });
}

function clientBaseUrl(tenant: ITenant): string {
  if (tenant.domain.startsWith('http')) {
    return tenant.domain.replace(/\/$/, '');
  }
  return `http://${tenant.domain}`;
}

export class MercadoPagoService {
  static async createPreference(
    order: IOrder,
    tenant: ITenant
  ): Promise<MercadoPagoPreferenceResponse> {
    if (order.payment.method !== 'mercadopago') {
      throw new AppError('El pedido no usa MercadoPago', 400);
    }

    if (order.payment.status === 'verified') {
      throw new AppError('El pedido ya fue pagado', 400);
    }

    const client = getClient(tenant);
    const preference = new Preference(client);
    const orderId = order._id.toString();
    const baseUrl = clientBaseUrl(tenant);
    const webClientUrl = env.corsOrigin[0] ?? 'http://localhost:5173';

    const items = order.items.map((item) => ({
      id: item.menuItemId.toString(),
      title: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: tenant.config.currency,
    }));

    if (order.tip > 0) {
      items.push({
        id: 'tip',
        title: 'Propina',
        quantity: 1,
        unit_price: order.tip,
        currency_id: tenant.config.currency,
      });
    }

    if (order.deliveryFee > 0) {
      items.push({
        id: 'delivery',
        title: 'Envío',
        quantity: 1,
        unit_price: order.deliveryFee,
        currency_id: tenant.config.currency,
      });
    }

    const result = await preference.create({
      body: {
        items,
        back_urls: {
          success: `${webClientUrl}/payment/success?orderId=${orderId}`,
          failure: `${webClientUrl}/payment/failure?orderId=${orderId}`,
          pending: `${webClientUrl}/payment/pending?orderId=${orderId}`,
        },
        auto_return: 'approved',
        external_reference: orderId,
        notification_url: `${env.apiUrl}/api/v1/webhooks/mercadopago?tenantId=${tenant._id.toString()}`,
        metadata: {
          tenant_id: tenant._id.toString(),
          order_id: orderId,
          order_number: order.orderNumber,
        },
      },
    });

    const initPoint =
      env.nodeEnv === 'production'
        ? result.init_point
        : (result.sandbox_init_point ?? result.init_point);

    if (!initPoint) {
      throw new AppError('No se pudo crear la preferencia de MercadoPago', 502);
    }

    return {
      preferenceId: result.id ?? '',
      initPoint,
      sandboxInitPoint: result.sandbox_init_point ?? null,
    };
  }

  static async getPayment(paymentId: string, tenant: ITenant) {
    const client = getClient(tenant);
    const payment = new Payment(client);
    return payment.get({ id: paymentId });
  }
}
