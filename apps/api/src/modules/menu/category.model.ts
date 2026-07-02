import mongoose, { Schema, type Document } from 'mongoose';

export interface IMenuCategory extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: { es: string; en: string; pt: string };
  sortOrder: number;
  isActive: boolean;
  deletedAt: Date | null;
}

const categorySchema = new Schema<IMenuCategory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: {
      es: { type: String, required: true },
      en: { type: String, required: true },
      pt: { type: String, required: true },
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

categorySchema.index({ tenantId: 1, sortOrder: 1 });
categorySchema.index({ tenantId: 1, isActive: 1 });

export const MenuCategory = mongoose.model<IMenuCategory>('MenuCategory', categorySchema);
