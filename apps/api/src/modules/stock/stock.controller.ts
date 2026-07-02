import type { Request, Response, NextFunction } from 'express';
import { createIngredientSchema, updateIngredientSchema, createStockMovementSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { getParam } from '../../utils/params.js';
import { StockService } from './stock.service.js';

export const listIngredients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const items = await StockService.list(req.tenant._id.toString());
    res.json(apiSuccess(items));
  } catch (e) {
    next(e);
  }
};

export const listAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const items = await StockService.listAlerts(req.tenant._id.toString());
    res.json(apiSuccess(items));
  } catch (e) {
    next(e);
  }
};

export const createIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const parsed = createIngredientSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    const item = await StockService.create(req.tenant._id.toString(), parsed.data);
    res.status(201).json(apiSuccess(item));
  } catch (e) {
    next(e);
  }
};

export const updateIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const parsed = updateIngredientSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    const item = await StockService.update(req.tenant._id.toString(), getParam(req, 'id'), parsed.data);
    res.json(apiSuccess(item));
  } catch (e) {
    next(e);
  }
};

export const createMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const parsed = createStockMovementSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);

    const movement = await StockService.registerMovement(
      req.tenant._id.toString(),
      parsed.data,
      req.user?.id
    );
    res.status(201).json(apiSuccess(movement));
  } catch (e) {
    next(e);
  }
};
