import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { SalesAnalytics, TenantAdminSettings } from '@bistro/shared-types';
import { StatCard } from '../components/StatCard';
import { MetaConnectionWidget } from '../components/MetaConnectionWidget';
import { PilotReadinessWidget } from '../components/PilotReadinessWidget';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../utils/format';

export function DashboardPage() {
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [settings, setSettings] = useState<TenantAdminSettings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<SalesAnalytics>('/api/v1/analytics/sales'),
      apiFetch<TenantAdminSettings>('/api/v1/tenant/settings'),
    ])
      .then(([sales, tenantSettings]) => {
        setData(sales);
        setSettings(tenantSettings);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {settings && (
        <>
          <PilotReadinessWidget settings={settings} />
          <MetaConnectionWidget settings={settings} />
        </>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Hoy" value={formatCurrency(data.revenue.today)} />
            <StatCard label="Esta semana" value={formatCurrency(data.revenue.thisWeek)} />
            <StatCard label="Este mes" value={formatCurrency(data.revenue.thisMonth)} />
            <StatCard
              label="Ticket promedio"
              value={formatCurrency(data.orders.averageTicket)}
              sub={`${data.orders.total} pedidos totales`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl border border-primary/10 p-5">
              <h2 className="font-semibold mb-4">Ingresos últimos 30 días</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenue.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="amount" fill="#1A1A2E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-primary/10 p-5">
              <h2 className="font-semibold mb-4">Top ítems del mes</h2>
              <ul className="space-y-2">
                {data.topItems.length === 0 ? (
                  <p className="text-sm text-primary/40">Sin datos de ventas aún</p>
                ) : (
                  data.topItems.map((item) => (
                    <li
                      key={item.menuItemId}
                      className="flex justify-between text-sm py-2 border-b border-primary/5"
                    >
                      <span>
                        {item.name}{' '}
                        <span className="text-primary/40">×{item.quantity}</span>
                      </span>
                      <span className="font-medium">{formatCurrency(item.revenue)}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl border border-primary/10 p-5">
              <h2 className="font-semibold mb-3">Pedidos por origen</h2>
              <ul className="space-y-1 text-sm">
                {Object.entries(data.orders.bySource).map(([src, count]) => (
                  <li key={src} className="flex justify-between">
                    <span className="uppercase text-primary/60">{src}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface rounded-xl border border-primary/10 p-5">
              <h2 className="font-semibold mb-3">Horas pico</h2>
              <ul className="space-y-1 text-sm">
                {data.peakHours.map((h) => (
                  <li key={h.hour} className="flex justify-between">
                    <span>{h.hour}:00</span>
                    <span className="font-medium">{h.orderCount} pedidos</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
