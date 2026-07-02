import bcrypt from 'bcryptjs';
import type { ImpersonateResponse, LoginResponse } from '@bistro/shared-types';
import { AppError } from '../../utils/api-response.js';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.js';
import { User } from './user.model.js';
import { Tenant } from '../tenant/tenant.model.js';
import { ImpersonationAuditService } from '../platform/impersonation-audit.service.js';
const SALT_ROUNDS = 12;

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async login(
    tenantId: string,
    email: string,
    password: string,
    device = 'web'
  ): Promise<LoginResponse> {
    const user = await User.findOne({
      tenantId,
      email: email.toLowerCase(),
      deletedAt: null,
      isActive: true,
    });

    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const valid = await this.comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const payload = {
      sub: user._id.toString(),
      tenantId: user.tenantId?.toString() ?? '',
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    user.refreshTokens.push({ token: refreshToken, expiresAt, device });
    user.lastLogin = new Date();
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId?.toString() ?? null,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { verifyRefreshToken } = await import('../../utils/jwt.js');
    const payload = verifyRefreshToken(refreshToken);

    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AppError('Sesión inválida', 401);
    }

    const stored = user.refreshTokens.find((t) => t.token === refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Refresh token expirado', 401);
    }

    const newPayload = {
      sub: user._id.toString(),
      tenantId: user.tenantId?.toString() ?? '',
      role: user.role,
      ...(payload.impersonatedBy && { impersonatedBy: payload.impersonatedBy }),
    };

    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    user.refreshTokens.push({ token: newRefreshToken, expiresAt, device: stored.device });
    await user.save();

    return { accessToken, refreshToken: newRefreshToken };
  }

  static async platformLogin(
    email: string,
    password: string,
    device = 'web'
  ): Promise<LoginResponse> {
    const user = await User.findOne({
      email: email.toLowerCase(),
      role: 'platform_admin',
      deletedAt: null,
      isActive: true,
    });

    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const valid = await this.comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const payload = {
      sub: user._id.toString(),
      tenantId: '',
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    user.refreshTokens.push({ token: refreshToken, expiresAt, device });
    user.lastLogin = new Date();
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: null,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  static async impersonateTenantAdmin(
    platformAdminUserId: string,
    tenantId: string,
    device = 'web',
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<ImpersonateResponse> {
    const platformAdmin = await User.findOne({
      _id: platformAdminUserId,
      role: 'platform_admin',
      deletedAt: null,
      isActive: true,
    });
    if (!platformAdmin) {
      throw new AppError('Operador de plataforma no válido', 403);
    }

    const tenant = await Tenant.findOne({ _id: tenantId, deletedAt: null });
    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404);
    }

    const targetAdmin = await User.findOne({
      tenantId: tenant._id,
      role: 'admin',
      deletedAt: null,
      isActive: true,
    }).sort({ lastLogin: -1, createdAt: 1 });

    if (!targetAdmin) {
      throw new AppError('Este restaurante no tiene un administrador activo', 404);
    }

    const payload = {
      sub: targetAdmin._id.toString(),
      tenantId: tenant._id.toString(),
      role: targetAdmin.role,
      impersonatedBy: platformAdmin._id.toString(),
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    targetAdmin.refreshTokens.push({
      token: refreshToken,
      expiresAt,
      device: `impersonation:${platformAdmin._id.toString()}`,
    });
    await targetAdmin.save();

    const auditLog = await ImpersonationAuditService.logStart({
      platformAdminId: platformAdmin._id.toString(),
      platformAdminEmail: platformAdmin.email,
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      targetAdminId: targetAdmin._id.toString(),
      targetAdminEmail: targetAdmin.email,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? device,
    });

    return {
      user: {
        id: targetAdmin._id.toString(),
        email: targetAdmin.email,
        name: targetAdmin.name,
        role: targetAdmin.role,
        tenantId: tenant._id.toString(),
      },
      tokens: { accessToken, refreshToken },
      tenant: { slug: tenant.slug, name: tenant.name },
      impersonation: {
        auditLogId: auditLog.id,
        platformAdminId: platformAdmin._id.toString(),
        platformAdminEmail: platformAdmin.email,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      },
    };
  }
}
