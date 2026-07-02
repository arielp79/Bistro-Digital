import type { Request, Response, NextFunction } from 'express';
import {
  createCategorySchema,
  createMenuItemSchema,
  updateCategorySchema,
  updateMenuItemSchema,
} from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { getParam } from '../../utils/params.js';
import { resolveLang } from '../../utils/locale.js';
import { MenuService } from './menu.service.js';

export const getPublicMenu = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant requerido', 400);
    }

    const lang = resolveLang(
      typeof req.query.lang === 'string' ? req.query.lang : req.tenant.config.defaultLanguage
    );

    const menu = await MenuService.getPublicMenu(
      req.tenant._id.toString(),
      lang,
      req.tenant.config.currency
    );

    res.json(apiSuccess(menu));
  } catch (error) {
    next(error);
  }
};

export const listCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const categories = await MenuService.listCategories(req.tenant._id.toString());
    res.json(apiSuccess(categories));
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const category = await MenuService.createCategory(
      req.tenant._id.toString(),
      parsed.data
    );
    res.status(201).json(apiSuccess(category));
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const category = await MenuService.updateCategory(
      req.tenant._id.toString(),
      getParam(req, 'id'),
      parsed.data
    );
    if (!category) throw new AppError('Categoría no encontrada', 404);

    res.json(apiSuccess(category));
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    try {
      const category = await MenuService.deleteCategory(
        req.tenant._id.toString(),
        getParam(req, 'id')
      );
      if (!category) throw new AppError('Categoría no encontrada', 404);
      res.json(apiSuccess({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message.includes('ítems')) {
        throw new AppError(err.message, 400);
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

export const listItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const items = await MenuService.listItems(req.tenant._id.toString(), categoryId);
    res.json(apiSuccess(items));
  } catch (error) {
    next(error);
  }
};

export const getItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const item = await MenuService.getItem(req.tenant._id.toString(), getParam(req, 'id'));
    if (!item) throw new AppError('Ítem no encontrado', 404);

    res.json(apiSuccess(item));
  } catch (error) {
    next(error);
  }
};

export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = createMenuItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    try {
      const item = await MenuService.createItem(req.tenant._id.toString(), parsed.data);
      res.status(201).json(apiSuccess(item));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Categoría')) {
        throw new AppError(err.message, 404);
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const parsed = updateMenuItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    try {
      const item = await MenuService.updateItem(
        req.tenant._id.toString(),
        getParam(req, 'id'),
        parsed.data
      );
      if (!item) throw new AppError('Ítem no encontrado', 404);
      res.json(apiSuccess(item));
    } catch (err) {
      if (err instanceof Error && err.message.includes('Categoría')) {
        throw new AppError(err.message, 404);
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenant) throw new AppError('Tenant requerido', 400);

    const item = await MenuService.deleteItem(req.tenant._id.toString(), getParam(req, 'id'));
    if (!item) throw new AppError('Ítem no encontrado', 404);

    res.json(apiSuccess({ deleted: true }));
  } catch (error) {
    next(error);
  }
};
