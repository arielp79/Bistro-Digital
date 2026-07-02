import { Worker, type Job } from 'bullmq';
import mongoose from 'mongoose';
import type { DeliveryJobData } from '../services/queue.service.js';
import { getQueueConnection } from '../services/queue.service.js';
import { TenantService } from '../modules/tenant/tenant.service.js';
import { MenuItem } from '../modules/menu/menu-item.model.js';
import { Order } from '../modules/orders/order.model.js';
import { OrderService } from '../modules/orders/order.service.js';
import { tenantQuery } from '../utils/api-response.js';
import { AiService } from '../services/ai.service.js';
import { DeliveryService } from '../modules/delivery/delivery.service.js';
import {
  DeliverySessionService,
  type IDeliverySession,
  type OrderDraft,
  type OrderDraftItem,
} from '../modules/delivery/delivery-session.model.js';
import { WhatsAppService, InstagramService } from '../modules/delivery/messaging/whatsapp.service.js';
import type { ITenant } from '../modules/tenant/tenant.model.js';
import type { DeliveryIntent, SupportedLang } from '@bistro/shared-types';
import type { IMenuItem } from '../modules/menu/menu-item.model.js';

let worker: Worker<DeliveryJobData> | null = null;

async function sendReply(
  tenant: ITenant,
  platform: DeliveryJobData['platform'],
  to: string,
  text: string
): Promise<void> {
  if (platform === 'instagram') {
    await InstagramService.sendText(tenant, to, text);
  } else {
    await WhatsAppService.sendText(tenant, to, text);
  }
}

async function processTextMessage(
  tenant: ITenant,
  session: IDeliverySession,
  from: string,
  text: string,
  platform: DeliveryJobData['platform']
): Promise<void> {
  const lang = (tenant.config.defaultLanguage ?? 'es') as SupportedLang;
  const menuItems = await MenuItem.find(
    tenantQuery(tenant._id.toString(), { isAvailable: true })
  );

  await DeliverySessionService.addMessage(session._id.toString(), 'user', text);

  const intent = await AiService.extractDeliveryIntent(
    text,
    menuItems,
    session.conversationHistory,
    tenant.name,
    lang
  );

  let reply = intent.responseToCustomer;

  if (intent.intent === 'cancel') {
    await DeliverySessionService.updateSession(session._id.toString(), {
      state: 'cancelled',
      currentOrderDraft: null,
    });
    await sendReply(tenant, platform, from, reply);
    await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
    return;
  }

  if (intent.intent === 'check_status' && session.orderId) {
    const status = await OrderService.getOrderStatus(
      tenant._id.toString(),
      session.orderId.toString()
    );
    reply = `Tu pedido ${status.orderNumber} está en estado: *${status.status}*.`;
    await sendReply(tenant, platform, from, reply);
    await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
    return;
  }

  if (intent.clarificationNeeded && intent.clarificationQuestion) {
    reply = intent.clarificationQuestion;
    await DeliverySessionService.updateSession(session._id.toString(), {
      state: 'collecting_items',
    });
    await sendReply(tenant, platform, from, reply);
    await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
    return;
  }

  const draft = await buildDraftFromIntent(session, intent, tenant, menuItems);
  if (!draft.items.length) {
    await sendReply(tenant, platform, from, reply);
    await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
    return;
  }

  const address = intent.customerInfo.address ?? draft.customerAddress;
  if (!address) {
    await DeliverySessionService.updateSession(session._id.toString(), {
      state: 'collecting_address',
      currentOrderDraft: draft,
    });
    reply = '¿A qué dirección enviamos tu pedido? (calle, número y barrio)';
    await sendReply(tenant, platform, from, reply);
    await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
    return;
  }

  draft.customerAddress = address;
  const shipping = await DeliveryService.calculateShipping(tenant, address);
  if (!shipping.isDeliverable || shipping.fee == null) {
    reply = `Lo sentimos, no llegamos a tu zona (${shipping.distanceKm} km). ¿Querés retirar en el local?`;
    await sendReply(tenant, platform, from, reply);
    await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
    return;
  }

  draft.deliveryFee = shipping.fee;
  draft.shippingDistanceKm = shipping.distanceKm;

  const confirmText = lowerIncludesConfirm(text) || session.state === 'confirming';
  if (!confirmText) {
    const subtotal = await estimateSubtotal(draft, menuItems);
    const summary = DeliveryService.formatOrderSummary(
      draft.items.map((i: OrderDraft['items'][number]) => {
        const mi = menuItems.find((m: IMenuItem) => m._id.toString() === i.menuItemId);
        return {
          name: mi?.name?.es ?? 'Ítem',
          quantity: i.quantity,
          unitPrice: mi?.basePrice ?? 0,
        };
      }),
      subtotal,
      draft.deliveryFee,
      tenant.config.currency
    );
    reply = `${summary}\n\nEnvío estimado: ~${shipping.estimatedMinutes} min (${shipping.distanceKm} km).\n¿Confirmás el pedido? (sí/no)`;
    await DeliverySessionService.updateSession(session._id.toString(), {
      state: 'confirming',
      currentOrderDraft: draft,
    });
    await sendReply(tenant, platform, from, reply);
    await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
    return;
  }

  const order = await OrderService.createOrder(tenant._id.toString(), tenant.slug, {
    type: 'delivery',
    source: platform === 'instagram' ? 'instagram' : 'whatsapp',
    items: draft.items.map((i: OrderDraft['items'][number]) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      selectedModifiers: i.selectedModifiers,
      notes: i.notes,
    })),
    customer: {
      name: intent.customerInfo.name ?? draft.customerName ?? '',
      phone: intent.customerInfo.phone ?? from,
      address: draft.customerAddress,
    },
    tip: 0,
    deliveryFee: draft.deliveryFee,
    paymentMethod: draft.paymentMethod ?? 'transfer',
  });

  if (order.payment.method === 'transfer') {
    reply = `¡Pedido ${order.orderNumber} confirmado! Total: $${order.total.toLocaleString('es-AR')}.\nEnviá el comprobante de transferencia por acá.`;
    await DeliverySessionService.updateSession(session._id.toString(), {
      state: 'awaiting_payment',
      currentOrderDraft: draft,
      orderId: new mongoose.Types.ObjectId(order.id),
    });
  } else {
    reply = `¡Pedido ${order.orderNumber} confirmado! Llegará en ~${shipping.estimatedMinutes} min.`;
    await DeliverySessionService.updateSession(session._id.toString(), {
      state: 'completed',
      currentOrderDraft: null,
      orderId: new mongoose.Types.ObjectId(order.id),
    });
  }

  await sendReply(tenant, platform, from, reply);
  await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
}

async function processVoucherImage(
  tenant: ITenant,
  session: IDeliverySession,
  from: string,
  imageUrl: string | null,
  platform: DeliveryJobData['platform']
): Promise<void> {
  if (!session.orderId) {
    const reply = 'Recibí tu imagen. Si es un comprobante, primero confirmá un pedido.';
    await sendReply(tenant, platform, from, reply);
    return;
  }

  const order = await Order.findById(session.orderId);
  if (!order) {
    await sendReply(tenant, platform, from, 'No encontramos tu pedido activo.');
    return;
  }

  const validation = await AiService.validateTransferVoucher(
    imageUrl ?? '',
    order.total,
    tenant.config.afip?.cuit ?? ''
  );

  let reply: string;
  if (validation.autoApproved) {
    order.payment.status = 'verified';
    order.status = 'confirmed';
    order.timestamps.confirmedAt = new Date();
    await order.save();
    reply = `¡Pago verificado! Tu pedido ${order.orderNumber} ya está en cocina.`;
    await DeliverySessionService.updateSession(session._id.toString(), { state: 'completed' });
  } else {
    reply = `Recibimos tu comprobante. ${validation.notes || 'Lo revisará nuestro equipo en breve.'}`;
  }

  await sendReply(tenant, platform, from, reply);
  await DeliverySessionService.addMessage(session._id.toString(), 'assistant', reply);
}

async function buildDraftFromIntent(
  session: IDeliverySession,
  intent: DeliveryIntent,
  tenant: ITenant,
  menuItems: IMenuItem[]
): Promise<OrderDraft> {
  const existing = session.currentOrderDraft ?? {
    items: [],
    customerName: '',
    customerAddress: '',
    deliveryFee: 0,
    shippingDistanceKm: 0,
    paymentMethod: tenant.config.paymentMethods.transfer ? 'transfer' : 'cash',
  };

  for (const item of intent.items) {
    const valid = menuItems.some((m) => m._id.toString() === item.menuItemId);
    if (!valid) continue;
    const idx = existing.items.findIndex((i: OrderDraftItem) => i.menuItemId === item.menuItemId);
    if (idx >= 0) {
      existing.items[idx].quantity += item.quantity;
    } else {
      existing.items.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        selectedModifiers: [],
        notes: item.notes ?? '',
      });
    }
  }

  if (intent.customerInfo.name) existing.customerName = intent.customerInfo.name;
  if (intent.customerInfo.address) existing.customerAddress = intent.customerInfo.address;

  return existing;
}

async function estimateSubtotal(
  draft: OrderDraft,
  menuItems: Array<{ _id: mongoose.Types.ObjectId; basePrice: number }>
): Promise<number> {
  return draft.items.reduce((sum: number, item: OrderDraft['items'][number]) => {
    const mi = menuItems.find((m) => m._id.toString() === item.menuItemId);
    return sum + (mi?.basePrice ?? 0) * item.quantity;
  }, 0);
}

function lowerIncludesConfirm(text: string): boolean {
  const t = text.toLowerCase().trim();
  return ['si', 'sí', 'confirmo', 'confirmar', 'dale', 'ok', 'yes'].some((w) => t.includes(w));
}

async function handleJob(job: Job<DeliveryJobData>): Promise<void> {
  const { platform, tenantId, from, type, text, imageId, imageUrl } = job.data;
  const tenant = await TenantService.findById(tenantId);
  if (!tenant) {
    console.error('[DeliveryWorker] Tenant no encontrado:', tenantId);
    return;
  }

  const session = await DeliverySessionService.getOrCreate(tenantId, from, platform);

  if (type === 'text' && text) {
    await processTextMessage(tenant, session, from, text, platform);
    return;
  }

  if (type === 'image') {
    let url = imageUrl ?? null;
    if (!url && imageId) {
      url = await WhatsAppService.getMediaUrl(tenant, imageId);
    }
    await processVoucherImage(tenant, session, from, url, platform);
  }
}

export function startDeliveryWorker(): Worker<DeliveryJobData> {
  if (worker) return worker;

  worker = new Worker<DeliveryJobData>('delivery-messages', handleJob, {
    connection: getQueueConnection(),
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    console.error('[DeliveryWorker] Job fallido:', job?.id, err.message);
  });

  worker.on('completed', (job) => {
    console.log('[DeliveryWorker] Job completado:', job.id);
  });

  console.log('[DeliveryWorker] Worker iniciado');
  return worker;
}

export async function stopDeliveryWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

export function isDeliveryWorkerActive(): boolean {
  return worker !== null;
}
