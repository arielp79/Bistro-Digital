import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  ImpersonateResponse,
  PlatformE2eCleanupResult,
  PlatformMetrics,
  PlatformTenantSummary,
  TenantPlan,
} from '@bistro/shared-types';
import { StatCard } from '../components/StatCard';
import { platformFetch, platformFetchWithMeta } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { formatCurrency } from '../utils/format';

const PAGE_SIZE = 20;

const PLAN_LABELS: Record<TenantPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export function PlatformDashboardPage() {
  const navigate = useNavigate();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [tenants, setTenants] = useState<PlatformTenantSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<TenantPlan | ''>('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<PlatformE2eCleanupResult | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        includeInactive: String(includeInactive),
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (search.trim()) params.set('search', search.trim());
      if (planFilter) params.set('plan', planFilter);

      const [metricsData, tenantsRes] = await Promise.all([
        platformFetch<PlatformMetrics>('/api/v1/platform/metrics'),
        platformFetchWithMeta<PlatformTenantSummary[]>(`/api/v1/platform/tenants?${params}`),
      ]);

      setMetrics(metricsData);
      setTenants(tenantsRes.data);
      setTotal(tenantsRes.meta?.total ?? tenantsRes.data.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [includeInactive, page, planFilter, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearch = () => {
    setPage(1);
    void loadData();
  };

  const toggleTenant = async (tenant: PlatformTenantSummary) => {
    setActionId(tenant.id);
    setError('');
    try {
      await platformFetch<PlatformTenantSummary>(`/api/v1/platform/tenants/${tenant.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionId(null);
    }
  };

  const enterAsAdmin = async (tenant: PlatformTenantSummary) => {
    if (tenant.stats.users === 0) return;
    setImpersonatingId(tenant.id);
    setError('');
    try {
      const data = await platformFetch<ImpersonateResponse>(
        `/api/v1/platform/tenants/${tenant.id}/impersonate`,
        { method: 'POST' }
      );
      startImpersonation(data);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setImpersonatingId(null);
    }
  };

  const cleanupE2e = async () => {
    if (!confirm('¿Eliminar todos los tenants con slug e2e-* y sus datos?')) return;
    setError('');
    try {
      const result = await platformFetch<PlatformE2eCleanupResult>(
        '/api/v1/platform/tenants/e2e-cleanup',
        { method: 'DELETE' }
      );
      setCleanupResult(result);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Restaurantes en la plataforma</h1>
        <button
          type="button"
          onClick={() => void cleanupE2e()}
          className="text-sm px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
        >
          Limpiar tenants E2E
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {cleanupResult && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          Eliminados {cleanupResult.deletedTenants} tenant(s):{' '}
          {cleanupResult.deletedSlugs.join(', ') || 'ninguno'}
        </p>
      )}

      {metrics && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Restaurantes activos"
              value={String(metrics.tenants.active)}
              sub={`${metrics.tenants.total} total`}
            />
            <StatCard label="Suspendidos" value={String(metrics.tenants.inactive)} />
            <StatCard
              label="Ingresos del mes"
              value={formatCurrency(metrics.orders.revenueThisMonth)}
              sub={`${metrics.orders.paidThisMonth} pedidos pagados`}
            />
            <StatCard label="Usuarios staff" value={String(metrics.users.total)} />
          </div>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(metrics.tenants.byPlan) as [TenantPlan, number][]).map(([plan, count]) => (
              <button
                key={plan}
                type="button"
                onClick={() => {
                  setPlanFilter((prev) => (prev === plan ? '' : plan));
                  setPage(1);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  planFilter === plan
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {PLAN_LABELS[plan]}: {count}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Buscar por nombre o slug..."
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm min-w-[220px]"
        />
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value as TenantPlan | '');
            setPage(1);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
        >
          <option value="">Todos los planes</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => {
              setIncludeInactive(e.target.checked);
              setPage(1);
            }}
          />
          Incluir suspendidos
        </label>
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 text-sm rounded-xl bg-slate-900 text-white"
        >
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Restaurante</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Usuarios</th>
              <th className="px-4 py-3 font-medium">Pedidos</th>
              <th className="px-4 py-3 font-medium">Ingresos mes</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/platform/tenants/${t.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {t.name}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{PLAN_LABELS[t.plan]}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {t.isActive ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{t.stats.users}</td>
                  <td className="px-4 py-3">{t.stats.orders}</td>
                  <td className="px-4 py-3">{formatCurrency(t.stats.revenueThisMonth)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      to={`/platform/tenants/${t.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white inline-block"
                    >
                      Ver
                    </Link>
                    <button
                      type="button"
                      disabled={impersonatingId === t.id || t.stats.users === 0}
                      onClick={() => void enterAsAdmin(t)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                      title={t.stats.users === 0 ? 'Sin administrador' : undefined}
                    >
                      {impersonatingId === t.id ? '...' : 'Entrar'}
                    </button>
                    <button
                      type="button"
                      disabled={actionId === t.id}
                      onClick={() => void toggleTenant(t)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50"
                    >
                      {t.isActive ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Página {page} de {totalPages} — {total} restaurante(s)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
