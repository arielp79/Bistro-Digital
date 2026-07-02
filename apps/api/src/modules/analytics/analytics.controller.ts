import type { Request, Response, NextFunction } from 'express';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { AnalyticsService } from './analytics.service.js';

export const getSalesAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;

    const data = await AnalyticsService.getSales(req.tenant._id.toString(), from, to);
    res.json(apiSuccess(data));
  } catch (e) {
    next(e);
  }
};

export const getTopItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const data = await AnalyticsService.getSales(req.tenant._id.toString());
    res.json(apiSuccess(data.topItems));
  } catch (e) {
    next(e);
  }
};
