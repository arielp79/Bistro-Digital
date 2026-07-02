import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { corsOptions } from '../config/cors.js';
import { OrderService } from '../modules/orders/order.service.js';

let io: Server | null = null;

function authenticateSocket(socket: Socket): { tenantId: string; userId: string } | null {
  const token = socket.handshake.auth?.token as string | undefined;
  const tenantId = socket.handshake.auth?.tenantId as string | undefined;

  if (!token || !tenantId) return null;

  try {
    const payload = verifyAccessToken(token);
    if (payload.tenantId !== tenantId) return null;
    return { tenantId, userId: payload.sub };
  } catch {
    return null;
  }
}

export function setupSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: corsOptions,
  });

  io.on('connection', (socket) => {
    const auth = authenticateSocket(socket);
    if (!auth) {
      socket.disconnect(true);
      return;
    }

    const { tenantId } = auth;
    socket.join(`tenant:${tenantId}`);
    console.log(`[Socket] Cliente conectado — tenant:${tenantId}`);

    socket.on('order:update_status', async ({ orderId, status }, callback) => {
      try {
        const order = await OrderService.updateStatus(tenantId, orderId, status);
        callback?.({ success: true, order });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar';
        callback?.({ success: false, error: message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Cliente desconectado — tenant:${tenantId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO no inicializado');
  }
  return io;
}

export function emitToTenant(tenantId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}

export function emitToRoom(room: string, event: string, data: unknown): void {
  if (io) {
    io.to(room).emit(event, data);
  }
}
