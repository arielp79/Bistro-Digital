import mongoose from 'mongoose';
import type { SalesAnalytics } from '@bistro/shared-types';
import { tenantQuery } from '../../utils/api-response.js';
import { Order } from '../orders/order.model.js';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
}

export class AnalyticsService {
  static async getSales(tenantId: string, from?: Date, to?: Date): Promise<SalesAnalytics> {
    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = daysAgo(7);
    const monthStart = daysAgo(30);
    const rangeFrom = from ?? monthStart;
    const rangeTo = to ?? now;

    const paidMatch = {
      tenantId: tenantOid,
      deletedAt: null,
      status: 'paid',
      'timestamps.paidAt': { $gte: rangeFrom, $lte: rangeTo },
    };

    const [todayAgg, weekAgg, monthAgg, byDay, byStatus, bySource, topItems, peakHours, totalOrders] =
      await Promise.all([
        Order.aggregate([
          { $match: { ...paidMatch, 'timestamps.paidAt': { $gte: todayStart } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Order.aggregate([
          { $match: { ...paidMatch, 'timestamps.paidAt': { $gte: weekStart } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Order.aggregate([
          { $match: paidMatch },
          { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: paidMatch },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamps.paidAt' } },
              revenue: { $sum: '$total' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Order.aggregate([
          { $match: tenantQuery(tenantId) },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: paidMatch },
          { $group: { _id: '$source', count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: paidMatch },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.menuItemId',
              name: { $first: '$items.name' },
              quantity: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
            },
          },
          { $sort: { quantity: -1 } },
          { $limit: 10 },
        ]),
        Order.aggregate([
          { $match: paidMatch },
          {
            $group: {
              _id: { $hour: '$timestamps.paidAt' },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Order.countDocuments(tenantQuery(tenantId)),
      ]);

    const monthData = monthAgg[0];
    const avgTicket = monthData?.count ? monthData.total / monthData.count : 0;

    return {
      revenue: {
        today: todayAgg[0]?.total ?? 0,
        thisWeek: weekAgg[0]?.total ?? 0,
        thisMonth: monthData?.total ?? 0,
        byDay: byDay.map((d: { _id: string; revenue: number }) => ({
          date: d._id,
          amount: d.revenue,
        })),
      },
      orders: {
        total: totalOrders,
        byStatus: Object.fromEntries(
          byStatus.map((s: { _id: string; count: number }) => [s._id, s.count])
        ),
        averageTicket: Math.round(avgTicket * 100) / 100,
        bySource: Object.fromEntries(
          bySource.map((s: { _id: string; count: number }) => [s._id, s.count])
        ),
      },
      topItems: topItems.map(
        (i: { _id: mongoose.Types.ObjectId; name: string; quantity: number; revenue: number }) => ({
          menuItemId: i._id.toString(),
          name: i.name,
          quantity: i.quantity,
          revenue: i.revenue,
        })
      ),
      peakHours: peakHours.map((h: { _id: number; orderCount: number }) => ({
        hour: h._id,
        orderCount: h.orderCount,
      })),
    };
  }
}
