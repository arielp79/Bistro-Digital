import type { Request, Response, NextFunction } from 'express';
import { createUserSchema, updateUserSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { getParam } from '../../utils/params.js';
import { UsersService } from './users.service.js';

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const users = await UsersService.list(req.tenant._id.toString());
    res.json(apiSuccess(users));
  } catch (e) {
    next(e);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    const user = await UsersService.create(req.tenant._id.toString(), parsed.data);
    res.status(201).json(apiSuccess(user));
  } catch (e) {
    next(e);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);

    const user = await UsersService.update(
      req.tenant._id.toString(),
      getParam(req, 'id'),
      parsed.data
    );
    res.json(apiSuccess(user));
  } catch (e) {
    next(e);
  }
};
