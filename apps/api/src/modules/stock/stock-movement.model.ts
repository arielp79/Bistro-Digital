import mongoose, { Schema, type Document } from 'mongoose';

export type StockMovementType = 'restock' | 'consumption' | 'adjustment' | 'waste';

export interface IStockMovement extends Document {
  tenantId: mongoose.Types.ObjectId;
  ingredientId: mongoose.Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  relatedOrderId: mongoose.Types.ObjectId | null;
  performedBy: mongoose.Types.ObjectId | null;
  notes: string;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    type: {
      type: String,
      enum: ['restock', 'consumption', 'adjustment', 'waste'],
      required: true,
    },
    quantity: { type: Number, required: true },
    relatedOrderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ tenantId: 1, relatedOrderId: 1, type: 1 });
stockMovementSchema.index({ tenantId: 1, ingredientId: 1, createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
