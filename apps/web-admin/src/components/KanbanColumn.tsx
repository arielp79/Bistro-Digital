import { useState } from 'react';
import type { OrderStatus, OrderPublic } from '@bistro/shared-types';
import { OrderCard, getOrdersByStatus } from './OrderCard';

interface KanbanColumnProps {
  status: OrderStatus;
  label: string;
  color: string;
  orders: OrderPublic[];
  onAdvance: (orderId: string) => Promise<void>;
  onCancel?: (orderId: string) => Promise<void>;
}

export function KanbanColumn({ status, label, color, orders, onAdvance, onCancel }: KanbanColumnProps) {
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const columnOrders = getOrdersByStatus(orders, status);

  const handleAdvance = async (orderId: string) => {
    setAdvancingId(orderId);
    try {
      await onAdvance(orderId);
    } finally {
      setAdvancingId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!onCancel) return;
    setCancellingId(orderId);
    try {
      await onCancel(orderId);
    } finally {
      setCancellingId(null);
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
      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)]">
        {columnOrders.length === 0 ? (
          <p className="text-xs text-primary/30 text-center py-8">Sin pedidos</p>
        ) : (
          columnOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={handleAdvance}
              onCancel={onCancel ? handleCancel : undefined}
              advancing={advancingId === order.id}
              cancelling={cancellingId === order.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
