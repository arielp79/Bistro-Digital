import { describe, it, expect } from 'vitest';
import { OrderService } from './order.service.js';
import { AppError } from '../../utils/api-response.js';

const paymentMethods = {
  cash: true,
  transfer: false,
  mercadopago: true,
  stripe: false,
};

describe('OrderService.validatePaymentMethod', () => {
  it('acepta métodos habilitados', () => {
    expect(() => OrderService.validatePaymentMethod('cash', paymentMethods)).not.toThrow();
    expect(() => OrderService.validatePaymentMethod('mercadopago', paymentMethods)).not.toThrow();
  });

  it('rechaza métodos deshabilitados', () => {
    expect(() => OrderService.validatePaymentMethod('transfer', paymentMethods)).toThrow(AppError);
    expect(() => OrderService.validatePaymentMethod('stripe', paymentMethods)).toThrow(
      /no habilitado/
    );
  });
});
