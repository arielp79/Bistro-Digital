import { useState } from 'react';
import type { OrderStatus } from '@bistro/shared-types';
import { OrderCard, getOrdersByStatus } from './OrderCard';
import type { OrderPublic } from '@bistro/shared-types';

interface KanbanColumnProps {
  status: OrderStatus;
  label: string;
  color: string;
  orders: OrderPublic[];
  onAdvance: (orderId: string) => Promise<void>;
}

export function KanbanColumn({ status, label, color, orders, onAdvance }: KanbanColumnProps) {
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [advanceErrors, setAdvanceErrors] = useState<Record<string, string>>({});
  const columnOrders = getOrdersByStatus(orders, status);

  const handleAdvance = async (orderId: string) => {
    setAdvancingId(orderId);
    setAdvanceErrors((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
    try {
      await onAdvance(orderId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al avanzar pedido';
      setAdvanceErrors((prev) => ({ ...prev, [orderId]: message }));
    } finally {
      setAdvancingId(null);
    }
  };

  return (
    <div className={`flex flex-col min-w-[260px] max-w-[280px] rounded-xl border-t-4 ${color}`}>
      <div className="px-3 py-2 flex items-center justify-between">
        <h2 className="font-semibold text-sm">{label}</h2>
        <span className="text-xs font-medium bg-white/80 px-2 py-0.5 rounded-full">
          {columnOrders.length}
        </span>
      </div>
      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-140px)]">
        {columnOrders.length === 0 ? (
          <p className="text-xs text-primary/30 text-center py-8">Sin pedidos</p>
        ) : (
          columnOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={handleAdvance}
              advancing={advancingId === order.id}
              advanceError={advanceErrors[order.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}
