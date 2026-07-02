import type { Request, Response, NextFunction } from 'express';
import { createInvoiceSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { getParam } from '../../utils/params.js';
import { BillingService } from './billing.service.js';

export const testAfipConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const result = await BillingService.testAfipConnection(req.tenant._id.toString());
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
};

export const listBillableOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const orders = await BillingService.listBillableOrders(req.tenant._id.toString());
    res.json(apiSuccess(orders));
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const invoice = await BillingService.createInvoice(
      req.tenant._id.toString(),
      getParam(req, 'orderId'),
      parsed.data.invoiceType
    );

    res.status(201).json(apiSuccess(invoice));
  } catch (error) {
    next(error);
  }
};

export const downloadInvoicePdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const html = await BillingService.renderInvoicePdf(
      req.tenant._id.toString(),
      getParam(req, 'orderId')
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    next(error);
  }
};
