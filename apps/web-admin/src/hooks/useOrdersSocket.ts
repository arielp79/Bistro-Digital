import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { OrderPublic } from '@bistro/shared-types';
import { useAuthStore } from '../stores/auth.store';
import { useOrderStore } from '../stores/order.store';

export function useOrdersSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const upsertOrder = useOrderStore((s) => s.upsertOrder);

  useEffect(() => {
    if (!accessToken || !tenantId) return;

    const socket = io(window.location.origin, {
      auth: { token: accessToken, tenantId },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('order:new', (order: OrderPublic) => {
      upsertOrder(order);
    });

    socket.on(
      'order:status_changed',
      (payload: { orderId: string; status: string; order: OrderPublic }) => {
        upsertOrder(payload.order);
      }
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [accessToken, tenantId, upsertOrder]);

  return { connected };
}
