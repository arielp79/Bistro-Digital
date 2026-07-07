import mongoose, { Schema, type Document } from 'mongoose';
import type { DeliverySessionState } from '@bistro/shared-types';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface OrderDraftItem {
  menuItemId: string;
  quantity: number;
  selectedModifiers: Array<{ groupId: string; optionId: string }>;
  notes: string;
}

export interface OrderDraft {
  items: OrderDraftItem[];
  customerName: string;
  customerAddress: string;
  deliveryFee: number;
  shippingDistanceKm: number;
  paymentMethod: 'cash' | 'transfer';
}

export interface IDeliverySession extends Document {
  tenantId: mongoose.Types.ObjectId;
  platform: 'whatsapp' | 'instagram' | 'simulate';
  customerPhone: string;
  conversationHistory: ConversationMessage[];
  currentOrderDraft: OrderDraft | null;
  state: DeliverySessionState;
  orderId: mongoose.Types.ObjectId | null;
  expiresAt: Date;
}

const deliverySessionSchema = new Schema<IDeliverySession>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: 'Tenant' },
    platform: { type: String, enum: ['whatsapp', 'instagram', 'simulate'], required: true },
    customerPhone: { type: String, required: true },
    conversationHistory: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    currentOrderDraft: {
      type: {
        items: [
          {
            menuItemId: String,
            quantity: Number,
            selectedModifiers: [{ groupId: String, optionId: String }],
            notes: String,
          },
        ],
        customerName: String,
        customerAddress: String,
        deliveryFee: Number,
        shippingDistanceKm: Number,
        paymentMethod: { type: String, enum: ['cash', 'transfer'] },
      },
      default: null,
    },
    state: {
      type: String,
      enum: [
        'greeting',
        'collecting_items',
        'collecting_address',
        'confirming',
        'awaiting_payment',
        'completed',
        'cancelled',
      ],
      default: 'greeting',
    },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

deliverySessionSchema.index({ tenantId: 1, customerPhone: 1 }, { unique: true });
deliverySessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export const DeliverySession = mongoose.model<IDeliverySession>(
  'DeliverySession',
  deliverySessionSchema
);

export class DeliverySessionService {
  static async findById(sessionId: string): Promise<IDeliverySession | null> {
    return DeliverySession.findById(sessionId);
  }

  static async getOrCreate(
    tenantId: string,
    customerPhone: string,
    platform: IDeliverySession['platform']
  ): Promise<IDeliverySession> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await DeliverySession.findOneAndUpdate(
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        customerPhone,
      },
      {
        $setOnInsert: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          customerPhone,
          platform,
          conversationHistory: [],
          currentOrderDraft: null,
          state: 'greeting',
          orderId: null,
        },
        $set: { expiresAt },
      },
      { upsert: true, new: true }
    );
    return session!;
  }

  static async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    await DeliverySession.findByIdAndUpdate(sessionId, {
      $push: {
        conversationHistory: { role, content, timestamp: new Date() },
      },
      $set: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
  }

  static async updateSession(
    sessionId: string,
    update: Partial<Pick<IDeliverySession, 'state' | 'currentOrderDraft' | 'orderId'>>
  ): Promise<void> {
    await DeliverySession.findByIdAndUpdate(sessionId, {
      $set: {
        ...update,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
  }
}
