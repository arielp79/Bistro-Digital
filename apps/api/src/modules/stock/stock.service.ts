import mongoose from 'mongoose';
import type { Ingredient as IngredientPublic, StockMovementPublic, StockLowAlert } from '@bistro/shared-types';
import { AppError, tenantQuery } from '../../utils/api-response.js';
import { emitToTenant } from '../../services/socket.service.js';
import { MenuItem } from '../menu/menu-item.model.js';
import { Order, type IOrder } from '../orders/order.model.js';
import { Ingredient, type IIngredient } from './ingredient.model.js';
import { StockMovement } from './stock-movement.model.js';

type RecipeUnit = 'g' | 'ml' | 'unit';

function toPublic(ing: IIngredient): IngredientPublic {
  return {
    id: ing._id.toString(),
    name: ing.name,
    unit: ing.unit,
    currentStock: ing.currentStock,
    minimumStock: ing.minimumStock,
    costPerUnit: ing.costPerUnit,
    supplier: ing.supplier,
    isLowStock: ing.currentStock <= ing.minimumStock,
  };
}

function toMovementPublic(
  movement: InstanceType<typeof StockMovement>,
  ingredientName: string
): StockMovementPublic {
  return {
    id: movement._id.toString(),
    ingredientId: movement.ingredientId.toString(),
    ingredientName,
    type: movement.type,
    quantity: movement.quantity,
    relatedOrderId: movement.relatedOrderId?.toString() ?? null,
    notes: movement.notes,
    createdAt: movement.createdAt.toISOString(),
  };
}

/** Convierte cantidad de receta a la unidad del ingrediente en stock. */
export function convertRecipeQuantity(
  recipeQty: number,
  recipeUnit: RecipeUnit,
  ingredientUnit: IIngredient['unit']
): number {
  if (recipeUnit === ingredientUnit) return recipeQty;
  if (recipeUnit === 'g' && ingredientUnit === 'kg') return recipeQty / 1000;
  if (recipeUnit === 'ml' && ingredientUnit === 'l') return recipeQty / 1000;
  if (ingredientUnit === 'g' && recipeUnit === 'unit') return recipeQty;
  if (ingredientUnit === 'kg' && recipeUnit === 'unit') return recipeQty;
  return recipeQty;
}

interface IngredientNeed {
  ingredientId: string;
  quantity: number;
}

export class StockService {
  static async list(tenantId: string): Promise<IngredientPublic[]> {
    const items = await Ingredient.find(tenantQuery(tenantId)).sort({ name: 1 });
    return items.map(toPublic);
  }

  static async listAlerts(tenantId: string): Promise<IngredientPublic[]> {
    const items = await Ingredient.find(
      tenantQuery(tenantId, { $expr: { $lte: ['$currentStock', '$minimumStock'] } })
    );
    return items.map(toPublic);
  }

  static async create(
    tenantId: string,
    data: {
      name: string;
      unit: IIngredient['unit'];
      currentStock?: number;
      minimumStock?: number;
      costPerUnit?: number;
      supplier?: string;
    }
  ): Promise<IngredientPublic> {
    const ing = await Ingredient.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      ...data,
      lastRestockedAt: data.currentStock ? new Date() : null,
    });
    return toPublic(ing);
  }

  static async update(
    tenantId: string,
    id: string,
    data: Partial<{
      name: string;
      unit: IIngredient['unit'];
      currentStock: number;
      minimumStock: number;
      costPerUnit: number;
      supplier: string;
    }>
  ): Promise<IngredientPublic> {
    const ing = await Ingredient.findOneAndUpdate(
      tenantQuery(tenantId, { _id: id }),
      { $set: data },
      { new: true }
    );
    if (!ing) throw new AppError('Ingrediente no encontrado', 404);
    return toPublic(ing);
  }

  static async computeOrderNeeds(order: IOrder): Promise<IngredientNeed[]> {
    const needsMap = new Map<string, number>();

    for (const line of order.items) {
      const menuItem = await MenuItem.findOne(
        tenantQuery(order.tenantId.toString(), { _id: line.menuItemId, deletedAt: null })
      );
      if (!menuItem?.ingredients?.length) continue;

      for (const recipe of menuItem.ingredients) {
        const ingredient = await Ingredient.findOne(
          tenantQuery(order.tenantId.toString(), { _id: recipe.ingredientId, deletedAt: null })
        );
        if (!ingredient) continue;

        const perUnit = convertRecipeQuantity(
          recipe.quantity,
          recipe.unit as RecipeUnit,
          ingredient.unit
        );
        const total = perUnit * line.quantity;
        const id = ingredient._id.toString();
        needsMap.set(id, (needsMap.get(id) ?? 0) + total);
      }
    }

    return Array.from(needsMap.entries()).map(([ingredientId, quantity]) => ({
      ingredientId,
      quantity,
    }));
  }

  static async validateStockForOrder(tenantId: string, order: IOrder): Promise<void> {
    const needs = await this.computeOrderNeeds(order);
    if (needs.length === 0) return;

    const shortages: string[] = [];

    for (const need of needs) {
      const ingredient = await Ingredient.findOne(tenantQuery(tenantId, { _id: need.ingredientId }));
      if (!ingredient) continue;
      if (ingredient.currentStock < need.quantity) {
        shortages.push(
          `${ingredient.name}: disponible ${ingredient.currentStock} ${ingredient.unit}, necesario ${Math.round(need.quantity * 1000) / 1000} ${ingredient.unit}`
        );
      }
    }

    if (shortages.length > 0) {
      throw new AppError(`Stock insuficiente:\n${shortages.join('\n')}`, 409);
    }
  }

  static async isOrderDeducted(tenantId: string, orderId: string): Promise<boolean> {
    const exists = await StockMovement.exists({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      relatedOrderId: new mongoose.Types.ObjectId(orderId),
      type: 'consumption',
    });
    return Boolean(exists);
  }

  static async deductByOrder(
    tenantId: string,
    orderId: string,
    performedBy?: string
  ): Promise<StockMovementPublic[]> {
    if (await this.isOrderDeducted(tenantId, orderId)) {
      return [];
    }

    const order = await Order.findOne(tenantQuery(tenantId, { _id: orderId }));
    if (!order) throw new AppError('Pedido no encontrado', 404);

    await this.validateStockForOrder(tenantId, order);

    const needs = await this.computeOrderNeeds(order);
    if (needs.length === 0) return [];

    const movements: StockMovementPublic[] = [];

    for (const need of needs) {
      const ingredient = await Ingredient.findOneAndUpdate(
        tenantQuery(tenantId, { _id: need.ingredientId, currentStock: { $gte: need.quantity } }),
        { $inc: { currentStock: -need.quantity } },
        { new: true }
      );

      if (!ingredient) {
        throw new AppError('Stock insuficiente al descontar (concurrencia)', 409);
      }

      const movement = await StockMovement.create({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        ingredientId: ingredient._id,
        type: 'consumption',
        quantity: -need.quantity,
        relatedOrderId: order._id,
        performedBy: performedBy ? new mongoose.Types.ObjectId(performedBy) : null,
        notes: `Consumo pedido ${order.orderNumber}`,
      });

      movements.push(toMovementPublic(movement, ingredient.name));
      await this.checkMinimumStock(tenantId, ingredient._id.toString());
    }

    return movements;
  }

  static async registerMovement(
    tenantId: string,
    data: {
      ingredientId: string;
      type: 'restock' | 'consumption' | 'adjustment' | 'waste';
      quantity: number;
      notes?: string;
    },
    performedBy?: string
  ): Promise<StockMovementPublic> {
    const ingredient = await Ingredient.findOne(tenantQuery(tenantId, { _id: data.ingredientId }));
    if (!ingredient) throw new AppError('Ingrediente no encontrado', 404);

    const delta =
      data.type === 'consumption' || data.type === 'waste'
        ? -Math.abs(data.quantity)
        : data.quantity;

    if (ingredient.currentStock + delta < 0) {
      throw new AppError('El movimiento dejaría el stock en negativo', 400);
    }

    ingredient.currentStock += delta;
    if (data.type === 'restock' && delta > 0) {
      ingredient.lastRestockedAt = new Date();
    }
    await ingredient.save();

    const movement = await StockMovement.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      ingredientId: ingredient._id,
      type: data.type,
      quantity: delta,
      relatedOrderId: null,
      performedBy: performedBy ? new mongoose.Types.ObjectId(performedBy) : null,
      notes: data.notes ?? '',
    });

    await this.checkMinimumStock(tenantId, ingredient._id.toString());

    return toMovementPublic(movement, ingredient.name);
  }

  static async checkMinimumStock(tenantId: string, ingredientId: string): Promise<void> {
    const ingredient = await Ingredient.findOne(tenantQuery(tenantId, { _id: ingredientId }));
    if (!ingredient) return;

    if (ingredient.currentStock <= ingredient.minimumStock) {
      const alert: StockLowAlert = {
        ingredientId: ingredient._id.toString(),
        name: ingredient.name,
        currentStock: ingredient.currentStock,
        minimumStock: ingredient.minimumStock,
        unit: ingredient.unit,
      };
      emitToTenant(tenantId, 'stock:low_alert', alert);
    }
  }
}
