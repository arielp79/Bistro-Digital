import type { OrderPublic, OrderStatus } from '@bistro/shared-types';
import { create } from 'zustand';
import { apiFetch } from '../lib/api';

const ACTIVE_STATUSES = 'pending,confirmed,preparing,ready';

interface OrderState {
  orders: OrderPublic[];
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  setOrders: (orders: OrderPublic[]) => void;
  upsertOrder: (order: OrderPublic) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  advanceOrder: (orderId: string) => Promise<void>;
  removeDelivered: (orderId: string) => void;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<OrderPublic[]>(`/api/v1/orders?status=${ACTIVE_STATUSES}`);
      set({ orders: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error',
        loading: false,
      });
    }
  },

  setOrders: (orders) => set({ orders }),

  upsertOrder: (order) => {
    set((state) => {
      const idx = state.orders.findIndex((o) => o.id === order.id);
      if (idx === -1) {
        if (['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)) {
          return { orders: [order, ...state.orders] };
        }
        return state;
      }
      if (order.status === 'delivered' || order.status === 'cancelled' || order.status === 'paid') {
        return { orders: state.orders.filter((o) => o.id !== order.id) };
      }
      const orders = [...state.orders];
      orders[idx] = order;
      return { orders };
    });
  },

  updateOrderStatus: (orderId, status) => {
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    }));
  },

  advanceOrder: async (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (!order) return;

    if (order.payment.method === 'mercadopago' && order.payment.status !== 'verified') {
      throw new Error('Esperando confirmación de pago MercadoPago');
    }

    const next = NEXT_STATUS[order.status];
    if (!next) return;

    const updated = await apiFetch<OrderPublic>(`/api/v1/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: next }),
    });
    get().upsertOrder(updated);
  },

  removeDelivered: (orderId) => {
    set((state) => ({ orders: state.orders.filter((o) => o.id !== orderId) }));
  },
}));

export const KANBAN_COLUMNS: Array<{ status: OrderStatus; label: string; color: string }> = [
  { status: 'pending', label: 'Pendiente', color: 'border-amber-400 bg-amber-50' },
  { status: 'confirmed', label: 'Confirmado', color: 'border-blue-400 bg-blue-50' },
  { status: 'preparing', label: 'En preparación', color: 'border-orange-400 bg-orange-50' },
  { status: 'ready', label: 'Listo', color: 'border-green-400 bg-green-50' },
];

export function getNextStatusLabel(status: OrderStatus): string | null {
  const next = NEXT_STATUS[status];
  if (!next) return null;
  return KANBAN_COLUMNS.find((c) => c.status === next)?.label ?? next;
}
