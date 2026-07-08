import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BillableOrderPublic, InvoicePublic, TenantAdminSettings } from '@bistro/shared-types';
import { apiFetch, getTenantSlug } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { formatCurrency } from '../utils/format';

export function BillingPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [orders, setOrders] = useState<BillableOrderPublic[]>([]);
  const [settings, setSettings] = useState<TenantAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setError('');
    try {
      const [data, tenantSettings] = await Promise.all([
        apiFetch<BillableOrderPublic[]>('/api/v1/billing/orders'),
        apiFetch<TenantAdminSettings>('/api/v1/tenant/settings'),
      ]);
      setOrders(data);
      setSettings(tenantSettings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const emitInvoice = async (orderId: string, invoiceType: 'B' | 'C') => {
    setProcessingId(orderId);
    setError('');
    try {
      await apiFetch<InvoicePublic>(`/api/v1/billing/${orderId}/invoice`, {
        method: 'POST',
        body: JSON.stringify({ invoiceType }),
      });
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al emitir factura');
    } finally {
      setProcessingId(null);
    }
  };

  const openPdf = async (orderId: string) => {
    try {
      const res = await fetch(`/api/v1/billing/${orderId}/invoice/pdf`, {
        headers: {
          'X-Tenant-ID': getTenantSlug(),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      if (!res.ok) throw new Error('No se pudo abrir la factura');
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al abrir PDF');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Facturación AFIP</h1>
          <p className="text-sm text-primary/50 mt-1">
            Emití facturas B/C para pedidos pagados. Sin AFIP configurado se genera comprobante demo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="px-4 py-2 text-sm rounded-xl border border-primary/10 hover:bg-primary/5"
        >
          Actualizar
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {settings && !settings.afip.enabled && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950">
          Modo <strong>demo</strong> — las facturas no tienen validez fiscal.{' '}
          <Link to="/connect-afip" className="underline font-medium">
            Configurar AFIP
          </Link>{' '}
          para emitir CAE real.
        </div>
      )}

      {loading ? (
        <p className="text-primary/50">Cargando pedidos...</p>
      ) : orders.length === 0 ? (
        <div className="bg-surface rounded-xl border border-primary/10 p-8 text-center text-primary/50">
          No hay pedidos pagados o entregados para facturar.
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-primary/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary/5 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Factura</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-primary/5">
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3 capitalize">{order.status}</td>
                  <td className="px-4 py-3">
                    {order.billing ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-green-700">
                          {order.billing.invoiceType} — CAE {order.billing.cae.slice(0, 8)}…
                        </span>
                        {order.billing.mode === 'demo' && (
                          <span className="text-xs bg-accent/30 text-primary px-2 py-0.5 rounded-full">
                            Demo
                          </span>
                        )}
                        {order.billing.mode === 'homologacion' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Homologación
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-primary/40">Sin facturar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {order.billing ? (
                      <button
                        type="button"
                        onClick={() => openPdf(order.id)}
                        className="px-3 py-1.5 rounded-lg border border-primary/10 hover:bg-primary/5"
                      >
                        Ver PDF
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => void emitInvoice(order.id, 'B')}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50"
                        >
                          Factura B
                        </button>
                        <button
                          type="button"
                          disabled={processingId === order.id}
                          onClick={() => void emitInvoice(order.id, 'C')}
                          className="px-3 py-1.5 rounded-lg border border-primary/10 hover:bg-primary/5 disabled:opacity-50"
                        >
                          Factura C
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
