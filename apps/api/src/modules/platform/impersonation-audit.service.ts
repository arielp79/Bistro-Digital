import type { ImpersonationAuditLog } from '@bistro/shared-types';
import { AppError } from '../../utils/api-response.js';
import {
  ImpersonationAuditLog as ImpersonationAuditLogModel,
  type IImpersonationAuditLog,
} from './impersonation-audit.model.js';

function toPublic(log: IImpersonationAuditLog): ImpersonationAuditLog {
  const endedAt = log.endedAt ? log.endedAt.toISOString() : null;
  const startedAt = log.startedAt.toISOString();
  const durationSeconds =
    log.endedAt != null
      ? Math.max(0, Math.round((log.endedAt.getTime() - log.startedAt.getTime()) / 1000))
      : null;

  return {
    id: log._id.toString(),
    platformAdminId: log.platformAdminId.toString(),
    platformAdminEmail: log.platformAdminEmail,
    tenantId: log.tenantId.toString(),
    tenantSlug: log.tenantSlug,
    tenantName: log.tenantName,
    targetAdminId: log.targetAdminId.toString(),
    targetAdminEmail: log.targetAdminEmail,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    startedAt,
    endedAt,
    durationSeconds,
  };
}

export class ImpersonationAuditService {
  static async logStart(input: {
    platformAdminId: string;
    platformAdminEmail: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    targetAdminId: string;
    targetAdminEmail: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<ImpersonationAuditLog> {
    const log = await ImpersonationAuditLogModel.create({
      platformAdminId: input.platformAdminId,
      platformAdminEmail: input.platformAdminEmail,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      tenantName: input.tenantName,
      targetAdminId: input.targetAdminId,
      targetAdminEmail: input.targetAdminEmail,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      startedAt: new Date(),
      endedAt: null,
    });

    return toPublic(log);
  }

  static async endSession(auditLogId: string, platformAdminId: string): Promise<ImpersonationAuditLog> {
    const log = await ImpersonationAuditLogModel.findOne({
      _id: auditLogId,
      platformAdminId,
      endedAt: null,
    });

    if (!log) {
      throw new AppError('Sesión de impersonación no encontrada o ya finalizada', 404);
    }

    log.endedAt = new Date();
    await log.save();

    return toPublic(log);
  }

  static async list(options: {
    page?: number;
    limit?: number;
    tenantId?: string;
    tenantSlug?: string;
    platformAdminId?: string;
  }): Promise<{ logs: ImpersonationAuditLog[]; total: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (options.tenantId) filter.tenantId = options.tenantId;
    if (options.tenantSlug) filter.tenantSlug = options.tenantSlug.toLowerCase();
    if (options.platformAdminId) filter.platformAdminId = options.platformAdminId;

    const [logs, total] = await Promise.all([
      ImpersonationAuditLogModel.find(filter).sort({ startedAt: -1 }).skip(skip).limit(limit),
      ImpersonationAuditLogModel.countDocuments(filter),
    ]);

    return { logs: logs.map(toPublic), total };
  }
}
