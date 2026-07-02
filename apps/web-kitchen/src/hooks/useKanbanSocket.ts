import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { OrderPublic } from '@bistro/shared-types';
import { useAuthStore } from '../stores/auth.store';
import { useOrderStore } from '../stores/order.store';

function playNotification() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Sin audio — ignorar
  }
}

export function useKanbanSocket() {
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
    socket.on('connect_error', (err) => {
      setConnected(false);
      console.warn('[Kitchen Socket]', err.message);
    });

    socket.on('order:new', (order: OrderPublic) => {
      upsertOrder(order);
      playNotification();
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
