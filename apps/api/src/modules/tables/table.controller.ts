import type { Request, Response, NextFunction } from 'express';
import {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
} from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { getParam } from '../../utils/params.js';
import { TableService } from './table.service.js';

export const listTables = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const tables = await TableService.listTables(req.tenant._id.toString());
    res.json(apiSuccess(tables));
  } catch (error) {
    next(error);
  }
};

export const getTable = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const table = await TableService.getTable(
      req.tenant._id.toString(),
      getParam(req, 'tableId')
    );
    if (!table) throw new AppError('Mesa no encontrada', 404);
    res.json(apiSuccess(table));
  } catch (error) {
    next(error);
  }
};

export const createTable = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const parsed = createTableSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);

    const table = await TableService.createTable(req.tenant._id.toString(), parsed.data);
    res.status(201).json(apiSuccess(table));
  } catch (error) {
    next(error);
  }
};

export const updateTable = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const parsed = updateTableSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);

    const table = await TableService.updateTable(
      req.tenant._id.toString(),
      getParam(req, 'tableId'),
      parsed.data
    );
    res.json(apiSuccess(table));
  } catch (error) {
    next(error);
  }
};

export const deleteTable = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    await TableService.deleteTable(req.tenant._id.toString(), getParam(req, 'tableId'));
    res.json(apiSuccess({ deleted: true }));
  } catch (error) {
    next(error);
  }
};

export const updateTableStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const parsed = updateTableStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const table = await TableService.updateStatus(
      req.tenant._id.toString(),
      getParam(req, 'tableId'),
      parsed.data.status
    );
    res.json(apiSuccess(table));
  } catch (error) {
    next(error);
  }
};
