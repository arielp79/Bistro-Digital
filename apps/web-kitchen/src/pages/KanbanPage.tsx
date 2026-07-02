import { useEffect } from 'react';
import { KanbanColumn } from '../components/KanbanColumn';
import { useKanbanSocket } from '../hooks/useKanbanSocket';
import { KANBAN_COLUMNS, useOrderStore } from '../stores/order.store';
import { useAuthStore } from '../stores/auth.store';

export function KanbanPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const orders = useOrderStore((s) => s.orders);
  const loading = useOrderStore((s) => s.loading);
  const error = useOrderStore((s) => s.error);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const advanceOrder = useOrderStore((s) => s.advanceOrder);

  const { connected } = useKanbanSocket();

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-primary/10 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Tablero de cocina</h1>
            <p className="text-xs text-primary/50">
              {user?.name} · {orders.length} pedidos activos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                connected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {connected ? '● En vivo' : '○ Sin socket'}
            </span>
            <button
              onClick={fetchOrders}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition"
            >
              Actualizar
            </button>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg text-primary/60 hover:text-primary transition"
            >
              Salir
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        {loading && orders.length === 0 && (
          <p className="text-xs text-primary/40 mt-2">Cargando pedidos...</p>
        )}
      </header>

      <main className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-h-0 h-full">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              orders={orders}
              onAdvance={advanceOrder}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
