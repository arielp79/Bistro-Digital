import mongoose from 'mongoose';
import type { ApiResponse } from '@bistro/shared-types';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const apiSuccess = <T>(data: T, meta?: object): ApiResponse<T> => ({
  data,
  error: null,
  ...(meta && { meta }),
});

export const apiError = (message: string): ApiResponse<null> => ({
  data: null,
  error: message,
});

export const tenantQuery = (tenantId: string, extra: object = {}) => ({
  tenantId: new mongoose.Types.ObjectId(tenantId),
  deletedAt: null,
  ...extra,
});
