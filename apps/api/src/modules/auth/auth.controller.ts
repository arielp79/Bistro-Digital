import type { Request, Response, NextFunction } from 'express';
import { loginSchema, refreshTokenSchema } from '@bistro/validation-schemas';
import { AppError, apiSuccess } from '../../utils/api-response.js';
import { refreshTokenCookieOptions } from '../../utils/refresh-cookie.js';
import { AuthService } from './auth.service.js';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.tenant) {
      throw new AppError('Tenant requerido', 400);
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Datos inválidos', 400);
    }

    const result = await AuthService.login(
      req.tenant._id.toString(),
      parsed.data.email,
      parsed.data.password,
      req.headers['user-agent'] ?? 'web'
    );

    res.cookie('refreshToken', result.tokens.refreshToken, refreshTokenCookieOptions());

    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken as string | undefined;
    const parsed = refreshTokenSchema.safeParse({
      refreshToken: tokenFromCookie ?? req.body?.refreshToken,
    });

    if (!parsed.success) {
      throw new AppError('Refresh token requerido', 400);
    }

    const tokens = await AuthService.refresh(parsed.data.refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, refreshTokenCookieOptions());

    res.json(apiSuccess(tokens));
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }

    const { User } = await import('./user.model.js');
    const user = await User.findById(req.user.id).select('-passwordHash -refreshTokens');
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.json(
      apiSuccess({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId?.toString() ?? null,
      })
    );
  } catch (error) {
    next(error);
  }
};
