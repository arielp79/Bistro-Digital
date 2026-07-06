import { useEffect } from 'react';
import { KanbanColumn } from '../components/KanbanColumn';
import { useOrdersSocket } from '../hooks/useOrdersSocket';
import { KANBAN_COLUMNS, useOrderStore } from '../stores/order.store';

export function OrdersPage() {
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const error = useOrderStore((s) => s.error);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const advanceOrder = useOrderStore((s) => s.advanceOrder);
  const cancelOrder = useOrderStore((s) => s.cancelOrder);
  const { connected } = useOrdersSocket();

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pedidos en vivo</h1>
          <p className="text-sm text-primary/50">
            {orders.length} activos · actualización en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              connected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {connected ? '● En vivo' : '○ Sin socket — polling cada 30s'}
          </span>
          <button
            onClick={fetchOrders}
            className="text-sm px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition"
          >
            Actualizar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && orders.length === 0 && (
        <p className="text-sm text-primary/40">Cargando pedidos...</p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            orders={orders}
            onAdvance={advanceOrder}
            onCancel={cancelOrder}
          />
        ))}
      </div>
    </div>
  );
}
