import { useCallback, useEffect, useState } from 'react';
import type { ImpersonationAuditLog } from '@bistro/shared-types';
import { platformFetchWithMeta } from '../lib/api';

const PAGE_SIZE = 20;

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function PlatformAuditPage() {
  const [logs, setLogs] = useState<ImpersonationAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tenantFilter, setTenantFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (tenantFilter.trim()) params.set('tenantSlug', tenantFilter.trim());

      const res = await platformFetchWithMeta<ImpersonationAuditLog[]>(
        `/api/v1/platform/impersonation-logs?${params}`
      );
      setLogs(res.data);
      setTotal(res.meta?.total ?? res.data.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [page, tenantFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit log — Impersonación</h1>
        <p className="text-sm text-slate-500 mt-1">
          Registro de accesos de super-admin al panel de restaurantes.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Filtrar por slug</label>
          <input
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            placeholder="bistro-digital"
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-64"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void loadLogs();
          }}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
        >
          Buscar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Inicio</th>
              <th className="px-4 py-3 font-medium">Super-admin</th>
              <th className="px-4 py-3 font-medium">Restaurante</th>
              <th className="px-4 py-3 font-medium">Admin impersonado</th>
              <th className="px-4 py-3 font-medium">Duración</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Sin registros
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(log.startedAt).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <p>{log.platformAdminEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.tenantName}</p>
                    <p className="text-xs text-slate-400 font-mono">{log.tenantSlug}</p>
                  </td>
                  <td className="px-4 py-3">{log.targetAdminEmail}</td>
                  <td className="px-4 py-3">{formatDuration(log.durationSeconds)}</td>
                  <td className="px-4 py-3">
                    {log.endedAt ? (
                      <span className="text-green-700 text-xs font-medium">Finalizada</span>
                    ) : (
                      <span className="text-amber-700 text-xs font-medium">En curso</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Página {page} de {totalPages} ({total} registros)
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
  );
}
