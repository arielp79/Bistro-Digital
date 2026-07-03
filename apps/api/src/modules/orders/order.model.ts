import mongoose, { Schema, type Document } from 'mongoose';
import type { OrderSource, OrderStatus, OrderType, PaymentMethod } from '@bistro/shared-types';

export interface IOrder extends Document {
  tenantId: mongoose.Types.ObjectId;
  orderNumber: string;
  type: OrderType;
  source: OrderSource;
  status: OrderStatus;
  tableId: mongoose.Types.ObjectId | null;
  waiterId: mongoose.Types.ObjectId | null;
  customer: {
    name: string;
    phone: string;
    address: string | null;
    coords: { lat: number; lng: number } | null;
  };
  items: Array<{
    menuItemId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    unitPrice: number;
    selectedModifiers: Array<{
      groupName: string;
      optionName: string;
      priceAdjustment: number;
    }>;
    notes: string;
    status: 'pending' | 'preparing' | 'ready' | 'delivered';
  }>;
  subtotal: number;
  discounts: number;
  tip: number;
  deliveryFee: number;
  total: number;
  payment: {
    method: PaymentMethod | null;
    status: 'pending' | 'verified' | 'failed';
    transactionId: string | null;
    voucherImageUrl: string | null;
    voucherVerifiedByAI: boolean;
    voucherVerifiedAt: Date | null;
  };
  billing: {
    invoiceType: 'B' | 'C' | null;
    cae: string | null;
    caeExpiry: Date | null;
    pdfUrl: string | null;
    voucherNumber: number | null;
    pointOfSale: number | null;
    mode: 'production' | 'homologacion' | 'demo' | null;
    issuedAt: Date | null;
  };
  timestamps: {
    createdAt: Date;
    confirmedAt: Date | null;
    preparingAt: Date | null;
    readyAt: Date | null;
    deliveredAt: Date | null;
    paidAt: Date | null;
  };
  deletedAt: Date | null;
}

const orderSchema = new Schema<IOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    orderNumber: { type: String, required: true },
    type: { type: String, enum: ['dine-in', 'delivery', 'takeaway'], required: true },
    source: {
      type: String,
      enum: ['qr', 'waiter', 'whatsapp', 'instagram', 'manual'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', 'paid'],
      default: 'pending',
    },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },
    waiterId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    customer: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: null },
      coords: { lat: Number, lng: Number },
    },
    items: [
      {
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
        name: String,
        quantity: Number,
        unitPrice: Number,
        selectedModifiers: [
          {
            groupName: String,
            optionName: String,
            priceAdjustment: Number,
          },
        ],
        notes: { type: String, default: '' },
        status: {
          type: String,
          enum: ['pending', 'preparing', 'ready', 'delivered'],
          default: 'pending',
        },
      },
    ],
    subtotal: { type: Number, required: true },
    discounts: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    payment: {
      method: { type: String, enum: ['cash', 'transfer', 'mercadopago', 'stripe', null], default: null },
      status: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
      transactionId: { type: String, default: null },
      voucherImageUrl: { type: String, default: null },
      voucherVerifiedByAI: { type: Boolean, default: false },
      voucherVerifiedAt: { type: Date, default: null },
    },
    billing: {
      invoiceType: { type: String, enum: ['B', 'C', null], default: null },
      cae: { type: String, default: null },
      caeExpiry: { type: Date, default: null },
      pdfUrl: { type: String, default: null },
      voucherNumber: { type: Number, default: null },
      pointOfSale: { type: Number, default: null },
      mode: { type: String, enum: ['production', 'homologacion', 'demo', null], default: null },
      issuedAt: { type: Date, default: null },
    },
    timestamps: {
      createdAt: { type: Date, default: Date.now },
      confirmedAt: { type: Date, default: null },
      preparingAt: { type: Date, default: null },
      readyAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      paidAt: { type: Date, default: null },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ tenantId: 1, status: 1 });
orderSchema.index({ tenantId: 1, 'timestamps.createdAt': -1 });
orderSchema.index({ tenantId: 1, tableId: 1, status: 1 });
orderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });

export const Order = mongoose.model<IOrder>('Order', orderSchema);

interface IOrderCounter extends Document {
  tenantId: mongoose.Types.ObjectId;
  prefix: string;
  sequence: number;
}

const orderCounterSchema = new Schema<IOrderCounter>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  prefix: { type: String, required: true },
  sequence: { type: Number, default: 0 },
});

export const OrderCounter = mongoose.model<IOrderCounter>('OrderCounter', orderCounterSchema);
