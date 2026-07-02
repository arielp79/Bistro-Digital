import mongoose from 'mongoose';
import type { CreateOrderSchemaInput } from '@bistro/validation-schemas';
import type { OrderPublic, OrderStatusResponse, SupportedLang } from '@bistro/shared-types';
import { validateModifiers } from '@bistro/shared-types';
import { AppError, tenantQuery } from '../../utils/api-response.js';
import { localize } from '../../utils/locale.js';
import { emitToTenant, emitToRoom } from '../../services/socket.service.js';
import { MenuItem, type IMenuItem } from '../menu/menu-item.model.js';
import { Table } from '../tables/table.model.js';
import { TableService } from '../tables/table.service.js';
import { StockService } from '../stock/stock.service.js';
import { Order, OrderCounter, type IOrder } from './order.model.js';

async function nextOrderNumber(tenantId: string, slug: string): Promise<string> {
  const prefix = slug.slice(0, 1).toUpperCase();
  const counter = await OrderCounter.findOneAndUpdate(
    { tenantId: new mongoose.Types.ObjectId(tenantId) },
    {
      $inc: { sequence: 1 },
      $setOnInsert: { prefix, tenantId: new mongoose.Types.ObjectId(tenantId) },
    },
    { upsert: true, new: true }
  );
  return `${prefix}-${String(counter!.sequence).padStart(4, '0')}`;
}

function resolveModifiers(
  menuItem: IMenuItem,
  selected: Array<{ groupId: string; optionId: string }>,
  lang: SupportedLang
) {
  const modifierGroups = menuItem.modifierGroups.map((g) => ({
    groupId: g.groupId.toString(),
    required: g.required,
    minSelections: g.minSelections,
    maxSelections: g.maxSelections,
  }));

  if (!validateModifiers(modifierGroups, selected)) {
    throw new AppError(`Modificadores inválidos para "${localize(menuItem.name, lang)}"`, 400);
  }

  const resolved = selected.map((sel) => {
    const group = menuItem.modifierGroups.find((g) => g.groupId.toString() === sel.groupId);
    if (!group) throw new AppError('Grupo de modificadores no encontrado', 400);

    const option = group.options.find((o) => o.optionId.toString() === sel.optionId);
    if (!option) throw new AppError('Opción de modificador no encontrada', 400);

    return {
      groupName: localize(group.name, lang),
      optionName: localize(option.name, lang),
      priceAdjustment: option.priceAdjustment,
    };
  });

  const unitPrice =
    menuItem.basePrice + resolved.reduce((sum, m) => sum + m.priceAdjustment, 0);

  return { resolved, unitPrice };
}

function toPublicOrder(order: IOrder, tableLabel: string | null): OrderPublic {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    type: order.type,
    source: order.source,
    status: order.status,
    tableId: order.tableId?.toString() ?? null,
    tableLabel,
    items: order.items.map((item) => ({
      menuItemId: item.menuItemId.toString(),
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      selectedModifiers: item.selectedModifiers,
      notes: item.notes,
      status: item.status,
    })),
    subtotal: order.subtotal,
    discounts: order.discounts,
    tip: order.tip,
    deliveryFee: order.deliveryFee,
    total: order.total,
    payment: {
      method: order.payment.method,
      status: order.payment.status,
    },
    createdAt: order.timestamps.createdAt.toISOString(),
  };
}

export class OrderService {
  static validatePaymentMethod(
    paymentMethod: string,
    paymentMethods: {
      cash: boolean;
      transfer: boolean;
      mercadopago: boolean;
      stripe: boolean;
    }
  ): void {
    const enabled = paymentMethods[paymentMethod as keyof typeof paymentMethods];
    if (!enabled) {
      throw new AppError(`Método de pago "${paymentMethod}" no habilitado`, 400);
    }
  }

  static async createOrder(
    tenantId: string,
    tenantSlug: string,
    input: CreateOrderSchemaInput,
    lang: SupportedLang = 'es',
    paymentMethods?: {
      cash: boolean;
      transfer: boolean;
      mercadopago: boolean;
      stripe: boolean;
    }
  ): Promise<OrderPublic> {
    if (input.type === 'dine-in' && !input.tableId) {
      throw new AppError('Mesa requerida para pedidos en salón', 400);
    }

    if (input.type === 'delivery' && !input.customer?.address?.trim()) {
      throw new AppError('Dirección requerida para pedidos delivery', 400);
    }

    if (paymentMethods) {
      this.validatePaymentMethod(input.paymentMethod, paymentMethods);
    }

    let table = null;
    if (input.tableId) {
      table = await Table.findOne(tenantQuery(tenantId, { _id: input.tableId }));
      if (!table) throw new AppError('Mesa no encontrada', 404);
    }

    const orderItems: IOrder['items'] = [];
    let subtotal = 0;

    for (const itemInput of input.items) {
      const menuItem = await MenuItem.findOne(
        tenantQuery(tenantId, { _id: itemInput.menuItemId, isAvailable: true })
      );
      if (!menuItem) {
        throw new AppError(`Ítem de menú no disponible: ${itemInput.menuItemId}`, 400);
      }

      const { resolved, unitPrice } = resolveModifiers(
        menuItem,
        itemInput.selectedModifiers ?? [],
        lang
      );

      const lineTotal = unitPrice * itemInput.quantity;
      subtotal += lineTotal;

      orderItems.push({
        menuItemId: menuItem._id,
        name: localize(menuItem.name, lang),
        quantity: itemInput.quantity,
        unitPrice,
        selectedModifiers: resolved,
        notes: itemInput.notes ?? '',
        status: 'pending',
      });
    }

    const tip = input.tip ?? 0;
    const deliveryFee = input.deliveryFee ?? 0;
    const total = subtotal + tip + deliveryFee;
    const orderNumber = await nextOrderNumber(tenantId, tenantSlug);

    const order = await Order.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      orderNumber,
      type: input.type,
      source: input.source,
      status: 'pending',
      tableId: input.tableId ? new mongoose.Types.ObjectId(input.tableId) : null,
      customer: {
        name: input.customer?.name ?? '',
        phone: input.customer?.phone ?? '',
        address: input.customer?.address ?? null,
        coords: null,
      },
      items: orderItems,
      subtotal,
      discounts: 0,
      tip,
      deliveryFee,
      total,
      payment: {
        method: input.paymentMethod,
        status: 'pending',
      },
      timestamps: { createdAt: new Date() },
    });

    if (table) {
      await Table.findByIdAndUpdate(table._id, {
        status: 'occupied',
        currentOrderId: order._id,
      });
    }

    const publicOrder = toPublicOrder(order, table?.label ?? null);

    const isMercadoPagoPending =
      input.paymentMethod === 'mercadopago' && order.payment.status === 'pending';

    emitToTenant(tenantId, 'order:new', publicOrder);
    emitToRoom(`order:${order._id.toString()}`, 'order:status_changed', {
      orderId: order._id.toString(),
      status: order.status,
      order: publicOrder,
      awaitingPayment: isMercadoPagoPending,
    });

    return publicOrder;
  }

  static async getOrderStatus(tenantId: string, orderId: string): Promise<OrderStatusResponse> {
    const order = await Order.findOne(tenantQuery(tenantId, { _id: orderId }));
    if (!order) throw new AppError('Pedido no encontrado', 404);

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        status: i.status,
      })),
      payment: {
        method: order.payment.method,
        status: order.payment.status,
      },
      deliveryFee: order.deliveryFee,
      customerAddress: order.customer?.address ?? null,
      updatedAt: (order as IOrder & { updatedAt?: Date }).updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  static async getOrder(tenantId: string, orderId: string): Promise<OrderPublic> {
    const order = await Order.findOne(tenantQuery(tenantId, { _id: orderId }));
    if (!order) throw new AppError('Pedido no encontrado', 404);

    let tableLabel: string | null = null;
    if (order.tableId) {
      const table = await Table.findById(order.tableId);
      tableLabel = table?.label ?? null;
    }

    return toPublicOrder(order, tableLabel);
  }

  static async listActiveOrders(
    tenantId: string,
    statuses: string[]
  ): Promise<OrderPublic[]> {
    const filter =
      statuses.length > 0
        ? { status: { $in: statuses } }
        : { status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } };

    const orders = await Order.find(
      tenantQuery(tenantId, filter)
    ).sort({
      'timestamps.createdAt': -1,
    });

    const tableIds = orders
      .map((o) => o.tableId)
      .filter((id): id is mongoose.Types.ObjectId => id != null);

    const tables = await Table.find({ _id: { $in: tableIds } });
    const tableMap = new Map(tables.map((t) => [t._id.toString(), t.label]));

    return orders.map((order) =>
      toPublicOrder(order, order.tableId ? (tableMap.get(order.tableId.toString()) ?? null) : null)
    );
  }

  static async updateStatus(
    tenantId: string,
    orderId: string,
    status: IOrder['status']
  ): Promise<OrderPublic> {
    const order = await Order.findOne(tenantQuery(tenantId, { _id: orderId }));
    if (!order) throw new AppError('Pedido no encontrado', 404);

    if (
      order.payment.method === 'mercadopago' &&
      order.payment.status !== 'verified' &&
      status !== 'cancelled'
    ) {
      throw new AppError('El pedido aún no tiene el pago confirmado en MercadoPago', 400);
    }

    const previousStatus = order.status;

    if (status === 'preparing' && previousStatus !== 'preparing') {
      await StockService.deductByOrder(tenantId, orderId);
    }

    const now = new Date();
    order.status = status;

    if (status === 'confirmed' && !order.timestamps.confirmedAt) {
      order.timestamps.confirmedAt = now;
    }
    if (status === 'preparing' && !order.timestamps.preparingAt) {
      order.timestamps.preparingAt = now;
    }
    if (status === 'ready' && !order.timestamps.readyAt) {
      order.timestamps.readyAt = now;
    }
    if (status === 'delivered' && !order.timestamps.deliveredAt) {
      order.timestamps.deliveredAt = now;
    }
    if (status === 'paid' && !order.timestamps.paidAt) {
      order.timestamps.paidAt = now;
    }

    await order.save();

    if (status === 'delivered' && order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'available',
        currentOrderId: null,
      });
    }

    let tableLabel: string | null = null;
    if (order.tableId) {
      const table = await Table.findById(order.tableId);
      tableLabel = table?.label ?? null;
    }

    const publicOrder = toPublicOrder(order, tableLabel);

    emitToTenant(tenantId, 'order:status_changed', {
      orderId: order._id.toString(),
      status,
      order: publicOrder,
    });
    emitToRoom(`order:${order._id.toString()}`, 'order:status_changed', {
      orderId: order._id.toString(),
      status,
      order: publicOrder,
    });

    return publicOrder;
  }

  static async closeOrder(
    tenantId: string,
    orderId: string,
    waiterId?: string
  ): Promise<OrderPublic> {
    const order = await Order.findOne(tenantQuery(tenantId, { _id: orderId }));
    if (!order) throw new AppError('Pedido no encontrado', 404);

    if (['cancelled', 'paid'].includes(order.status)) {
      throw new AppError('El pedido ya está cerrado', 400);
    }

    order.status = 'paid';
    order.timestamps.paidAt = new Date();
    if (waiterId) {
      order.waiterId = new mongoose.Types.ObjectId(waiterId);
    }
    order.payment.status = order.payment.method === 'cash' ? 'verified' : order.payment.status;
    await order.save();

    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'available',
        currentOrderId: null,
      });
      const publicTable = await TableService.getTable(tenantId, order.tableId.toString());
      if (publicTable) {
        emitToTenant(tenantId, 'table:status_changed', publicTable);
      }
    }

    let tableLabel: string | null = null;
    if (order.tableId) {
      const table = await Table.findById(order.tableId);
      tableLabel = table?.label ?? null;
    }

    const publicOrder = toPublicOrder(order, tableLabel);

    emitToTenant(tenantId, 'order:status_changed', {
      orderId: order._id.toString(),
      status: 'paid',
      order: publicOrder,
    });

    return publicOrder;
  }

  static async confirmMercadoPagoPayment(
    tenantId: string,
    orderId: string,
    transactionId: string
  ): Promise<OrderPublic> {
    const order = await Order.findOne(tenantQuery(tenantId, { _id: orderId }));
    if (!order) throw new AppError('Pedido no encontrado', 404);

    if (order.payment.status === 'verified') {
      let tableLabel: string | null = null;
      if (order.tableId) {
        const table = await Table.findById(order.tableId);
        tableLabel = table?.label ?? null;
      }
      return toPublicOrder(order, tableLabel);
    }

    const now = new Date();
    order.payment.status = 'verified';
    order.payment.transactionId = transactionId;
    order.status = 'confirmed';
    order.timestamps.confirmedAt = now;
    await order.save();

    let tableLabel: string | null = null;
    if (order.tableId) {
      const table = await Table.findById(order.tableId);
      tableLabel = table?.label ?? null;
    }

    const publicOrder = toPublicOrder(order, tableLabel);

    emitToTenant(tenantId, 'order:new', publicOrder);
    emitToTenant(tenantId, 'order:status_changed', {
      orderId: order._id.toString(),
      status: 'confirmed',
      order: publicOrder,
    });
    emitToRoom(`order:${order._id.toString()}`, 'order:status_changed', {
      orderId: order._id.toString(),
      status: 'confirmed',
      order: publicOrder,
    });

    return publicOrder;
  }

  static async failMercadoPagoPayment(tenantId: string, orderId: string): Promise<void> {
    const order = await Order.findOne(tenantQuery(tenantId, { _id: orderId }));
    if (!order) return;

    if (order.payment.status === 'verified') return;

    order.payment.status = 'failed';
    await order.save();

    emitToRoom(`order:${order._id.toString()}`, 'order:status_changed', {
      orderId: order._id.toString(),
      status: order.status,
      paymentStatus: 'failed',
    });
  }
}
