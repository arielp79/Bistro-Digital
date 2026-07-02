import mongoose, { Schema, type Document } from 'mongoose';

const localizedSchema = {
  es: { type: String, required: true },
  en: { type: String, required: true },
  pt: { type: String, required: true },
};

const modifierOptionSchema = new Schema(
  {
    optionId: { type: Schema.Types.ObjectId, auto: true },
    name: localizedSchema,
    priceAdjustment: { type: Number, default: 0 },
  },
  { _id: false }
);

const modifierGroupSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, auto: true },
    name: localizedSchema,
    required: { type: Boolean, default: false },
    minSelections: { type: Number, default: 0 },
    maxSelections: { type: Number, default: 1 },
    options: [modifierOptionSchema],
  },
  { _id: false }
);

export interface IMenuItem extends Document {
  tenantId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  sku: string;
  name: { es: string; en: string; pt: string };
  description: { es: string; en: string; pt: string };
  imageUrl: string;
  basePrice: number;
  isAvailable: boolean;
  preparationTimeMinutes: number;
  tags: string[];
  modifierGroups: Array<{
    groupId: mongoose.Types.ObjectId;
    name: { es: string; en: string; pt: string };
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: Array<{
      optionId: mongoose.Types.ObjectId;
      name: { es: string; en: string; pt: string };
      priceAdjustment: number;
    }>;
  }>;
  ingredients: Array<{
    ingredientId: mongoose.Types.ObjectId;
    quantity: number;
    unit: 'g' | 'ml' | 'unit';
  }>;
  sortOrder: number;
  deletedAt: Date | null;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    sku: { type: String, required: true },
    name: localizedSchema,
    description: localizedSchema,
    imageUrl: { type: String, default: '' },
    basePrice: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
    preparationTimeMinutes: { type: Number, default: 15 },
    tags: [{ type: String }],
    modifierGroups: [modifierGroupSchema],
    ingredients: [
      {
        ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient' },
        quantity: Number,
        unit: { type: String, enum: ['g', 'ml', 'unit'] },
      },
    ],
    sortOrder: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

menuItemSchema.index({ tenantId: 1, categoryId: 1, isAvailable: 1 });
menuItemSchema.index({ tenantId: 1, sku: 1 }, { unique: true });

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
