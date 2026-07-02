import mongoose, { Schema, type Document } from 'mongoose';

export interface IIngredient extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  unit: 'g' | 'ml' | 'unit' | 'kg' | 'l';
  currentStock: number;
  minimumStock: number;
  costPerUnit: number;
  supplier: string;
  lastRestockedAt: Date | null;
  deletedAt: Date | null;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    unit: { type: String, enum: ['g', 'ml', 'unit', 'kg', 'l'], required: true },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    supplier: { type: String, default: '' },
    lastRestockedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ingredientSchema.index({ tenantId: 1, currentStock: 1 });

export const Ingredient = mongoose.model<IIngredient>('Ingredient', ingredientSchema);
