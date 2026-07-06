import type { OrderPublic, OrderStatus } from '@bistro/shared-types';
import { getNextStatusLabel } from '../stores/order.store';

interface OrderCardProps {
  order: OrderPublic;
  onAdvance: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
  advancing: boolean;
  cancelling?: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const SOURCE_LABELS: Record<string, string> = {
  qr: 'QR',
  waiter: 'Mozo',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  manual: 'Manual',
};

export function OrderCard({ order, onAdvance, onCancel, advancing, cancelling }: OrderCardProps) {
  const nextLabel = getNextStatusLabel(order.status);
  const location = order.tableLabel ?? (order.type === 'delivery' ? 'Delivery' : 'Sin mesa');
  const awaitingMp =
    order.payment.method === 'mercadopago' && order.payment.status !== 'verified';

  return (
    <article className="bg-surface rounded-xl border border-primary/10 p-3 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm">#{order.orderNumber}</p>
          <p className="text-xs text-primary/50">{location}</p>
        </div>
        <div className="text-right">
          {awaitingMp && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 block mb-1">
              Esperando pago MP
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary/60 uppercase">
            {SOURCE_LABELS[order.source] ?? order.source}
          </span>
          <p className="text-[10px] text-primary/40 mt-1">{timeAgo(order.createdAt)}</p>
        </div>
      </div>

      <ul className="space-y-1">
        {order.items.map((item, idx) => (
          <li key={idx} className="text-sm">
            <span className="font-medium">{item.quantity}×</span> {item.name}
            {item.notes && <p className="text-xs text-primary/50 italic ml-4">→ {item.notes}</p>}
          </li>
        ))}
      </ul>

      {nextLabel && !awaitingMp && (
        <button
          onClick={() => onAdvance(order.id)}
          disabled={advancing || cancelling}
          className="w-full py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {advancing ? '...' : `→ ${nextLabel}`}
        </button>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`¿Cancelar el pedido #${order.orderNumber}?`)) {
              onCancel(order.id);
            }
          }}
          disabled={advancing || cancelling}
          className="w-full py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
        >
          {cancelling ? 'Cancelando...' : 'Cancelar pedido'}
        </button>
      )}
    </article>
  );
}

export function getOrdersByStatus(orders: OrderPublic[], status: OrderStatus) {
  return orders.filter((o) => o.status === status);
}
