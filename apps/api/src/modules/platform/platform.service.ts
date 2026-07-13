import mongoose from 'mongoose';
import type {
  PlatformE2eCleanupResult,
  PlatformMetrics,
  PlatformTenantDetail,
  PlatformTenantSoftDeleteResult,
  PlatformTenantSummary,
  TenantPlan,
} from '@bistro/shared-types';
import { AppError } from '../../utils/api-response.js';
import { env } from '../../config/env.js';
import { User } from '../auth/user.model.js';
import { DeliverySession } from '../delivery/delivery-session.model.js';
import { MenuCategory } from '../menu/category.model.js';
import { MenuItem } from '../menu/menu-item.model.js';
import { Order } from '../orders/order.model.js';
import { Ingredient } from '../stock/ingredient.model.js';
import { StockMovement } from '../stock/stock-movement.model.js';
import { Table } from '../tables/table.model.js';
import { Tenant } from '../tenant/tenant.model.js';
import { TenantService } from '../tenant/tenant.service.js';
import { buildClientUrl } from '../../utils/tenant-host.js';

/** Tenants que no pueden eliminarse desde el panel platform. */
const PROTECTED_TENANT_SLUGS = new Set(['bistro-digital']);

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function buildSummariesForTenants(
  tenants: Array<{ _id: mongoose.Types.ObjectId; slug: string; name: string; plan: string; isActive: boolean; createdAt?: Date }>
): Promise<PlatformTenantSummary[]> {
  const monthStart = startOfMonth();
  const tenantIds = tenants.map((t) => t._id);

  const [userCounts, orderCounts, revenueAgg] = await Promise.all([
    User.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { tenantId: { $in: tenantIds }, deletedAt: null } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { tenantId: { $in: tenantIds }, deletedAt: null } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: mongoose.Types.ObjectId; revenue: number }>([
      {
        $match: {
          tenantId: { $in: tenantIds },
          deletedAt: null,
          status: 'paid',
          'timestamps.paidAt': { $gte: monthStart },
        },
      },
      { $group: { _id: '$tenantId', revenue: { $sum: '$total' } } },
    ]),
  ]);

  const usersByTenant = new Map(userCounts.map((r) => [r._id.toString(), r.count]));
  const ordersByTenant = new Map(orderCounts.map((r) => [r._id.toString(), r.count]));
  const revenueByTenant = new Map(revenueAgg.map((r) => [r._id.toString(), r.revenue]));

  return tenants.map((t) => {
    const id = t._id.toString();
    return {
      id,
      slug: t.slug,
      name: t.name,
      plan: t.plan as TenantPlan,
      isActive: t.isActive,
      createdAt: (t.createdAt ?? new Date()).toISOString(),
      stats: {
        users: usersByTenant.get(id) ?? 0,
        orders: ordersByTenant.get(id) ?? 0,
        revenueThisMonth: revenueByTenant.get(id) ?? 0,
      },
    };
  });
}

export class PlatformService {
  static async listTenants(options: {
    page?: number;
    limit?: number;
    search?: string;
    includeInactive?: boolean;
    plan?: TenantPlan;
  }): Promise<{ tenants: PlatformTenantSummary[]; total: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { deletedAt: null };
    if (!options.includeInactive) {
      filter.isActive = true;
    }
    if (options.plan) {
      filter.plan = options.plan;
    }
    if (options.search?.trim()) {
      const q = options.search.trim();
      filter.$or = [
        { slug: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Tenant.countDocuments(filter),
    ]);

    const summaries = await buildSummariesForTenants(tenants);
    return { tenants: summaries, total };
  }

  static async getTenantDetail(tenantId: string): Promise<PlatformTenantDetail> {
    const tenant = await Tenant.findOne({ _id: tenantId, deletedAt: null });
    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404);
    }

    const [summary] = await buildSummariesForTenants([tenant]);
    const tenantOid = tenant._id;

    const [
      admins,
      menuItems,
      tables,
      deliverySessions,
      ordersByStatus,
      ordersBySource,
    ] = await Promise.all([
      User.find({ tenantId: tenantOid, role: 'admin', deletedAt: null })
        .select('email name lastLogin')
        .lean(),
      MenuItem.countDocuments({ tenantId: tenantOid, deletedAt: null }),
      Table.countDocuments({ tenantId: tenantOid, deletedAt: null }),
      DeliverySession.countDocuments({ tenantId: tenantOid }),
      Order.aggregate<{ _id: string; count: number }>([
        { $match: { tenantId: tenantOid, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate<{ _id: string; count: number }>([
        { $match: { tenantId: tenantOid, deletedAt: null } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
    ]);

    const clientBase = buildClientUrl(tenant.domain, tenant.slug);
    const adminBase = env.corsOrigin.find((o) => o.includes('3001')) ?? 'http://localhost:3001';

    const metaStatus = TenantService.buildMetaStatus(tenant);
    const afip = tenant.config.afip;

    return {
      ...summary,
      domain: tenant.domain,
      updatedAt: tenant.updatedAt.toISOString(),
      metaStatus,
      integrations: {
        mercadopagoConfigured: Boolean(tenant.config.mercadopago?.accessToken),
        afipEnabled: afip?.enabled ?? false,
        afipConfigured: Boolean(afip?.certificate && afip?.privateKey),
      },
      admins: admins.map((a) => ({
        id: a._id.toString(),
        email: a.email,
        name: a.name,
        lastLogin: a.lastLogin ? (a.lastLogin as Date).toISOString() : null,
      })),
      stats: {
        ...summary.stats,
        menuItems,
        tables,
        deliverySessions,
        ordersByStatus: Object.fromEntries(ordersByStatus.map((r) => [r._id, r.count])),
        ordersBySource: Object.fromEntries(ordersBySource.map((r) => [r._id, r.count])),
      },
      urls: {
        clientBase,
        adminLogin: `${adminBase.replace(/\/$/, '')}/login`,
      },
    };
  }

  static async setTenantPlan(tenantId: string, plan: TenantPlan): Promise<PlatformTenantSummary> {
    const tenant = await Tenant.findOneAndUpdate(
      { _id: tenantId, deletedAt: null },
      { $set: { plan } },
      { new: true }
    );
    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404);
    }

    const [summary] = await buildSummariesForTenants([tenant]);
    return summary;
  }

  static async setTenantActive(tenantId: string, isActive: boolean): Promise<PlatformTenantSummary> {
    const tenant = await Tenant.findOneAndUpdate(
      { _id: tenantId, deletedAt: null },
      { $set: { isActive } },
      { new: true }
    );
    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404);
    }

    const [summary] = await buildSummariesForTenants([tenant]);
    return summary;
  }

  static async softDeleteTenant(tenantId: string): Promise<PlatformTenantSoftDeleteResult> {
    const tenant = await Tenant.findOne({ _id: tenantId, deletedAt: null });
    if (!tenant) {
      throw new AppError('Tenant no encontrado', 404);
    }
    if (PROTECTED_TENANT_SLUGS.has(tenant.slug)) {
      throw new AppError('No se puede eliminar el tenant de demostración', 403);
    }

    const deletedAt = new Date();
    await Promise.all([
      Tenant.updateOne({ _id: tenantId }, { $set: { deletedAt, isActive: false } }),
      User.updateMany(
        { tenantId: tenant._id, deletedAt: null },
        { $set: { deletedAt, isActive: false, refreshTokens: [] } }
      ),
    ]);

    return {
      id: tenantId,
      slug: tenant.slug,
      deletedAt: deletedAt.toISOString(),
    };
  }

  static async getMetrics(): Promise<PlatformMetrics> {
    const monthStart = startOfMonth();

    const [tenantStats, orderStats, userTotal] = await Promise.all([
      Tenant.aggregate<{ _id: { isActive: boolean; plan: TenantPlan }; count: number }>([
        { $match: { deletedAt: null } },
        { $group: { _id: { isActive: '$isActive', plan: '$plan' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate<{ _id: null; total: number; paidThisMonth: number; revenueThisMonth: number }>([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            paidThisMonth: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'paid'] },
                      { $gte: ['$timestamps.paidAt', monthStart] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            revenueThisMonth: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'paid'] },
                      { $gte: ['$timestamps.paidAt', monthStart] },
                    ],
                  },
                  '$total',
                  0,
                ],
              },
            },
          },
        },
      ]),
      User.countDocuments({ deletedAt: null, role: { $ne: 'platform_admin' } }),
    ]);

    let active = 0;
    let inactive = 0;
    const byPlan: Record<TenantPlan, number> = { starter: 0, pro: 0, enterprise: 0 };

    for (const row of tenantStats) {
      if (row._id.isActive) active += row.count;
      else inactive += row.count;
      byPlan[row._id.plan] = (byPlan[row._id.plan] ?? 0) + row.count;
    }

    const orders = orderStats[0] ?? { total: 0, paidThisMonth: 0, revenueThisMonth: 0 };

    return {
      tenants: {
        total: active + inactive,
        active,
        inactive,
        byPlan,
      },
      orders: {
        total: orders.total,
        paidThisMonth: orders.paidThisMonth,
        revenueThisMonth: orders.revenueThisMonth,
      },
      users: { total: userTotal },
    };
  }

  static async cleanupE2eTenants(): Promise<PlatformE2eCleanupResult> {
    const e2eTenants = await Tenant.find({
      slug: { $regex: /^e2e-/ },
      deletedAt: null,
    });

    const deletedSlugs: string[] = [];

    for (const tenant of e2eTenants) {
      const tenantId = tenant._id;
      await Promise.all([
        User.deleteMany({ tenantId }),
        Order.deleteMany({ tenantId }),
        MenuItem.deleteMany({ tenantId }),
        MenuCategory.deleteMany({ tenantId }),
        Table.deleteMany({ tenantId }),
        Ingredient.deleteMany({ tenantId }),
        StockMovement.deleteMany({ tenantId }),
        DeliverySession.deleteMany({ tenantId }),
      ]);
      await Tenant.deleteOne({ _id: tenantId });
      deletedSlugs.push(tenant.slug);
    }

    return { deletedTenants: deletedSlugs.length, deletedSlugs };
  }
}
