import type { Request, Response, NextFunction } from 'express';
import { mercadoPagoPreferenceSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess, tenantQuery } from '../../utils/api-response.js';
import { Order } from '../orders/order.model.js';
import { MercadoPagoService } from './mercadopago.service.js';

export const createMercadoPagoPreference = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    if (!req.tenant.config.paymentMethods.mercadopago) {
      throw new AppError('MercadoPago no está habilitado para este restaurante', 400);
    }

    const orderId =
      typeof req.query.orderId === 'string'
        ? req.query.orderId
        : mercadoPagoPreferenceSchema.safeParse(req.body).data?.orderId;

    if (!orderId) {
      throw new AppError('orderId requerido', 400);
    }

    const order = await Order.findOne(tenantQuery(req.tenant._id.toString(), { _id: orderId }));
    if (!order) throw new AppError('Pedido no encontrado', 404);

    const preference = await MercadoPagoService.createPreference(order, req.tenant);

    res.json(apiSuccess(preference));
  } catch (error) {
    next(error);
  }
};
