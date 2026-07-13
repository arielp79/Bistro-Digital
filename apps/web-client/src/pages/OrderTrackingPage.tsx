import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { OrderStatus, OrderStatusResponse } from '@bistro/shared-types';
import { useSessionStore } from '../stores/session.store';
import { useTenantSlug } from '../hooks/useTenantSlug';
import { apiUrl } from '../lib/api-base';
import { deliveryMenuPath, buildMenuQuery } from '../utils/table-query';

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

const STATUS_LABEL_KEYS: Record<string, string> = {
  pending: 'status.pending',
  confirmed: 'status.confirmed',
  preparing: 'status.preparing',
  ready: 'status.ready',
  delivered: 'status.delivered',
  paid: 'status.paid',
  cancelled: 'status.cancelled',
};

export function OrderTrackingPage() {
  const { t } = useTranslation(['order', 'common']);
  const { orderId } = useParams<{ orderId: string }>();
  const slug = useTenantSlug();
  const { tableId } = useSessionStore();
  const [order, setOrder] = useState<OrderStatusResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(apiUrl(`/api/v1/orders/${orderId}/status`), {
          headers: { 'X-Tenant-ID': slug },
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? 'Error');
        }
        setOrder(json.data);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [orderId, slug]);

  const currentStep = order ? STATUS_STEPS.indexOf(order.status) : -1;
  const isCancelled = order?.status === 'cancelled';

  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-primary/10 px-4 py-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold">{t('title')}</h1>
          {order && (
            <p className="text-sm text-primary/50 mt-1">
              #{order.orderNumber}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {error && !order && (
          <div className="text-center py-16">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {order && (
          <div className="space-y-8">
            {order.type === 'delivery' && order.customerAddress && (
              <div className="bg-surface rounded-xl border border-primary/10 p-4 text-sm">
                <p className="text-primary/50 uppercase text-xs font-medium tracking-wide mb-1">
                  {t('deliveryTo')}
                </p>
                <p className="font-medium">{order.customerAddress}</p>
                {order.deliveryFee > 0 && (
                  <p className="text-primary/60 mt-2">
                    {t('deliveryFee')}: ${order.deliveryFee.toLocaleString('es-AR')}
                  </p>
                )}
              </div>
            )}
            {order.payment?.method === 'mercadopago' && order.payment.status === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm text-center">
                {t('awaitingPayment')}
              </div>
            )}

            {order.payment?.method === 'mercadopago' && (
              <p className="text-center text-sm text-primary/50">
                {t(`paymentStatus.${order.payment.status}`)}
              </p>
            )}

            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-accent/30 rounded-full flex items-center justify-center text-2xl mb-4">
                {isCancelled ? '✕' : order.status === 'ready' || order.status === 'delivered' ? '✓' : '⏳'}
              </div>
              <p className="text-2xl font-bold">
                {t(STATUS_LABEL_KEYS[order.status] ?? 'status.pending')}
              </p>
            </div>

            {!isCancelled && (
              <div className="flex justify-between px-4">
                {STATUS_STEPS.map((step, idx) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx <= currentStep
                          ? 'bg-accent text-primary'
                          : 'bg-primary/10 text-primary/30'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-[10px] text-primary/50 mt-1 text-center leading-tight">
                      {t(STATUS_LABEL_KEYS[step])}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <section className="bg-surface rounded-xl border border-primary/10 p-4">
              <h2 className="text-sm font-medium text-primary/50 uppercase tracking-wide mb-3">
                {t('items')}
              </h2>
              <ul className="space-y-2">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-primary/40 text-xs">{item.status}</span>
                  </li>
                ))}
              </ul>
            </section>

            <p className="text-center text-xs text-primary/40">{t('autoRefresh')}</p>

            <Link
              to={
                order.type === 'delivery'
                  ? deliveryMenuPath(slug)
                  : `/menu${buildMenuQuery({ tenantSlug: slug, tableId })}`
              }
              className="block text-center text-accent font-medium hover:underline"
            >
              {t('orderMore')}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
