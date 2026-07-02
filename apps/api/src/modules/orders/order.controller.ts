import type { Request, Response, NextFunction } from 'express';
import { createOrderSchema, updateOrderStatusSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { getParam } from '../../utils/params.js';
import { resolveLang } from '../../utils/locale.js';
import { OrderService } from './order.service.js';

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const lang = resolveLang(
      typeof req.query.lang === 'string' ? req.query.lang : req.tenant.config.defaultLanguage
    );

    const order = await OrderService.createOrder(
      req.tenant._id.toString(),
      req.tenant.slug,
      parsed.data,
      lang,
      req.tenant.config.paymentMethods
    );

    res.status(201).json(apiSuccess(order));
  } catch (error) {
    next(error);
  }
};

export const getOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const status = await OrderService.getOrderStatus(
      req.tenant._id.toString(),
      getParam(req, 'orderId')
    );

    res.json(apiSuccess(status));
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const order = await OrderService.getOrder(
      req.tenant._id.toString(),
      getParam(req, 'orderId')
    );

    res.json(apiSuccess(order));
  } catch (error) {
    next(error);
  }
};

export const listOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const statusParam = typeof req.query.status === 'string' ? req.query.status : '';
    const statuses = statusParam
      ? statusParam.split(',').map((s) => s.trim()).filter(Boolean)
      : ['pending', 'confirmed', 'preparing', 'ready'];

    const orders = await OrderService.listActiveOrders(
      req.tenant._id.toString(),
      statuses
    );

    res.json(apiSuccess(orders));
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const order = await OrderService.updateStatus(
      req.tenant._id.toString(),
      getParam(req, 'orderId'),
      parsed.data.status
    );

    res.json(apiSuccess(order));
  } catch (error) {
    next(error);
  }
};

export const closeOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const order = await OrderService.closeOrder(
      req.tenant._id.toString(),
      getParam(req, 'orderId'),
      req.user?.id
    );

    res.json(apiSuccess(order));
  } catch (error) {
    next(error);
  }
};
