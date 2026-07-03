import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  ImpersonateResponse,
  PlatformTenantDetail,
  PlatformTenantSoftDeleteResult,
  PlatformTenantSummary,
  TenantPlan,
} from '@bistro/shared-types';
import { CopyField } from '../components/CopyField';
import { StatCard } from '../components/StatCard';
import { platformFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { formatCurrency } from '../utils/format';

const PLANS: TenantPlan[] = ['starter', 'pro', 'enterprise'];

const PLAN_LABELS: Record<TenantPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const DEMO_SLUG = 'bistro-digital';

const SOURCE_LABELS: Record<string, string> = {
  qr: 'QR',
  waiter: 'Mozo',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  manual: 'Manual',
};

export function PlatformTenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const [detail, setDetail] = useState<PlatformTenantDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const data = await platformFetch<PlatformTenantDetail>(`/api/v1/platform/tenants/${tenantId}`);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const changePlan = async (plan: TenantPlan) => {
    if (!tenantId || !detail || detail.plan === plan) return;
    setSavingPlan(true);
    setError('');
    try {
      await platformFetch<PlatformTenantSummary>(`/api/v1/platform/tenants/${tenantId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan }),
      });
      await loadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSavingPlan(false);
    }
  };

  const toggleStatus = async () => {
    if (!tenantId || !detail) return;
    setTogglingStatus(true);
    setError('');
    try {
      await platformFetch<PlatformTenantSummary>(`/api/v1/platform/tenants/${tenantId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !detail.isActive }),
      });
      await loadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setTogglingStatus(false);
    }
  };

  const enterAsAdmin = async () => {
    if (!tenantId || !detail?.admins.length) return;
    setImpersonating(true);
    setError('');
    try {
      const data = await platformFetch<ImpersonateResponse>(
        `/api/v1/platform/tenants/${tenantId}/impersonate`,
        { method: 'POST' }
      );
      startImpersonation(data);
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setImpersonating(false);
    }
  };

  const softDeleteTenant = async () => {
    if (!tenantId || !detail) return;
    const confirmed = window.confirm(
      `¿Eliminar "${detail.name}" (${detail.slug})?\n\n` +
        'El restaurante dejará de ser accesible. Los datos se conservan (soft-delete).'
    );
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    try {
      await platformFetch<PlatformTenantSoftDeleteResult>(
        `/api/v1/platform/tenants/${tenantId}`,
        { method: 'DELETE' }
      );
      navigate('/platform');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-400">Cargando restaurante...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/platform" className="text-sm text-slate-600 hover:text-slate-900">
          ← Volver al listado
        </Link>
        <p className="text-red-600">{error || 'Restaurante no encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/platform" className="text-sm text-slate-500 hover:text-slate-800">
            ← Restaurantes
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">{detail.name}</h1>
          <p className="text-sm font-mono text-slate-400">{detail.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={impersonating || detail.admins.length === 0}
            onClick={() => void enterAsAdmin()}
            className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            title={detail.admins.length === 0 ? 'Sin administrador activo' : undefined}
          >
            {impersonating ? 'Entrando...' : 'Entrar como admin'}
          </button>
          <button
            type="button"
            disabled={togglingStatus}
            onClick={() => void toggleStatus()}
            className={`text-sm px-4 py-2 rounded-lg border disabled:opacity-50 ${
              detail.isActive
                ? 'border-red-200 text-red-700 hover:bg-red-50'
                : 'border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            {detail.isActive ? 'Suspender' : 'Activar'}
          </button>
          {detail.slug !== DEMO_SLUG && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => void softDeleteTenant()}
              className="text-sm px-4 py-2 rounded-lg border border-red-300 text-red-800 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pedidos" value={String(detail.stats.orders)} />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(detail.stats.revenueThisMonth)}
        />
        <StatCard label="Ítems menú" value={String(detail.stats.menuItems)} />
        <StatCard label="Mesas" value={String(detail.stats.tables)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Plan y estado</h2>
          <div className="flex flex-wrap gap-2">
            {PLANS.map((plan) => (
              <button
                key={plan}
                type="button"
                disabled={savingPlan}
                onClick={() => void changePlan(plan)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize border disabled:opacity-50 ${
                  detail.plan === plan
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {PLAN_LABELS[plan]}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            Estado:{' '}
            <span className={detail.isActive ? 'text-green-700' : 'text-red-700'}>
              {detail.isActive ? 'Activo' : 'Suspendido'}
            </span>
          </p>
          <p className="text-sm text-slate-500">
            Alta: {new Date(detail.createdAt).toLocaleString('es-AR')}
          </p>
          <p className="text-sm text-slate-500">
            Última actualización: {new Date(detail.updatedAt).toLocaleString('es-AR')}
          </p>
          <p className="text-sm text-slate-500">
            Dominio: <code className="text-xs bg-slate-100 px-1 rounded">{detail.domain}</code>
          </p>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Integraciones</h2>
          <div className="flex flex-wrap gap-2">
            <Badge ok={detail.metaStatus.whatsappConnected} label="WhatsApp" />
            <Badge ok={detail.metaStatus.instagramConnected} label="Instagram" />
            <Badge ok={detail.integrations.mercadopagoConfigured} label="MercadoPago" />
            <Badge ok={detail.integrations.afipConfigured} label="AFIP cert." />
            <Badge ok={detail.integrations.afipEnabled} label="AFIP activo" />
          </div>
          <p className="text-xs text-slate-400">
            Delivery IA: {detail.metaStatus.deliveryReady ? 'Listo' : 'Pendiente configuración Meta'}
          </p>
          <p className="text-xs text-slate-400">
            Sesiones delivery: {detail.stats.deliverySessions}
          </p>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Enlaces</h2>
          <CopyField label="Cliente (menú)" value={detail.urls.clientBase} />
          <CopyField label="Panel admin (login)" value={detail.urls.adminLogin} />
          <p className="text-xs text-slate-400">
            Slug para login admin: <span className="font-mono">{detail.slug}</span>
          </p>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Administradores</h2>
          {detail.admins.length === 0 ? (
            <p className="text-sm text-slate-400">Sin admins registrados</p>
          ) : (
            <ul className="space-y-2">
              {detail.admins.map((admin) => (
                <li key={admin.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                  <p className="font-medium text-slate-800">{admin.name}</p>
                  <p className="text-slate-500">{admin.email}</p>
                  <p className="text-xs text-slate-400">
                    Último login:{' '}
                    {admin.lastLogin
                      ? new Date(admin.lastLogin).toLocaleString('es-AR')
                      : 'Nunca'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Pedidos por estado</h2>
          {Object.keys(detail.stats.ordersByStatus).length === 0 ? (
            <p className="text-sm text-slate-400">Sin pedidos</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {Object.entries(detail.stats.ordersByStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between text-slate-600">
                  <span className="capitalize">{status}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Pedidos por canal</h2>
          {Object.keys(detail.stats.ordersBySource).length === 0 ? (
            <p className="text-sm text-slate-400">Sin pedidos</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {Object.entries(detail.stats.ordersBySource).map(([source, count]) => (
                <li key={source} className="flex justify-between text-slate-600">
                  <span>{SOURCE_LABELS[source] ?? source}</span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {label}
    </span>
  );
}
