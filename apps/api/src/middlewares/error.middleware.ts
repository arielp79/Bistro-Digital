import type { Request, Response, NextFunction } from 'express';
import { AppError, apiError } from '../utils/api-response.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(apiError(err.message));
    return;
  }

  console.error('[Error]', err);
  res.status(500).json(apiError('Error interno del servidor'));
};
