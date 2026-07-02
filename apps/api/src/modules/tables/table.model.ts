import mongoose, { Schema, type Document } from 'mongoose';
import type { TableStatus } from '@bistro/shared-types';

export interface ITable extends Document {
  tenantId: mongoose.Types.ObjectId;
  number: number;
  label: string;
  capacity: number;
  zone: string;
  status: TableStatus;
  currentOrderId: mongoose.Types.ObjectId | null;
  qrCodeUrl: string;
  deletedAt: Date | null;
}

const tableSchema = new Schema<ITable>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    number: { type: Number, required: true },
    label: { type: String, required: true },
    capacity: { type: Number, default: 4 },
    zone: { type: String, default: 'Salón' },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'cleaning'],
      default: 'available',
    },
    currentOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    qrCodeUrl: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tableSchema.index({ tenantId: 1, number: 1 }, { unique: true });

export const Table = mongoose.model<ITable>('Table', tableSchema);
