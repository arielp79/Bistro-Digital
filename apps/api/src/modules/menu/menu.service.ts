import mongoose from 'mongoose';
import type {
  LocalizedText,
  MenuCategoryWithItems,
  MenuItemPublic,
  MenuResponse,
  SupportedLang,
} from '@bistro/shared-types';
import { tenantQuery } from '../../utils/api-response.js';
import { localize } from '../../utils/locale.js';
import { MenuCategory, type IMenuCategory } from './category.model.js';
import { MenuItem, type IMenuItem } from './menu-item.model.js';

function toPublicItem(item: IMenuItem, lang: SupportedLang): MenuItemPublic {
  return {
    id: item._id.toString(),
    categoryId: item.categoryId.toString(),
    sku: item.sku,
    name: localize(item.name, lang),
    description: localize(item.description, lang),
    imageUrl: item.imageUrl,
    basePrice: item.basePrice,
    isAvailable: item.isAvailable,
    preparationTimeMinutes: item.preparationTimeMinutes,
    tags: item.tags,
    modifierGroups: item.modifierGroups.map((g) => ({
      groupId: g.groupId.toString(),
      name: localize(g.name, lang),
      required: g.required,
      minSelections: g.minSelections,
      maxSelections: g.maxSelections,
      options: g.options.map((o) => ({
        optionId: o.optionId.toString(),
        name: localize(o.name, lang),
        priceAdjustment: o.priceAdjustment,
      })),
    })),
    sortOrder: item.sortOrder,
  };
}

function toCategoryPublic(
  category: IMenuCategory,
  items: MenuItemPublic[],
  lang: SupportedLang
): MenuCategoryWithItems {
  return {
    id: category._id.toString(),
    name: localize(category.name, lang),
    sortOrder: category.sortOrder,
    items,
  };
}

export class MenuService {
  static async getPublicMenu(
    tenantId: string,
    lang: SupportedLang,
    currency: 'ARS' | 'USD' | 'BRL'
  ): Promise<MenuResponse> {
    const categories = await MenuCategory.find(
      tenantQuery(tenantId, { isActive: true })
    ).sort({ sortOrder: 1 });

    const items = await MenuItem.find(
      tenantQuery(tenantId, { isAvailable: true })
    ).sort({ sortOrder: 1 });

    const itemsByCategory = new Map<string, MenuItemPublic[]>();
    for (const item of items) {
      const key = item.categoryId.toString();
      const list = itemsByCategory.get(key) ?? [];
      list.push(toPublicItem(item, lang));
      itemsByCategory.set(key, list);
    }

    const result: MenuCategoryWithItems[] = categories
      .map((cat) => {
        const catItems = itemsByCategory.get(cat._id.toString()) ?? [];
        if (catItems.length === 0) return null;
        return toCategoryPublic(cat, catItems, lang);
      })
      .filter((c): c is MenuCategoryWithItems => c !== null);

    return { lang, currency, categories: result };
  }

  static async listCategories(tenantId: string) {
    return MenuCategory.find(tenantQuery(tenantId)).sort({ sortOrder: 1 });
  }

  static async createCategory(
    tenantId: string,
    data: { name: LocalizedText; sortOrder?: number; isActive?: boolean }
  ) {
    return MenuCategory.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      ...data,
    });
  }

  static async updateCategory(
    tenantId: string,
    categoryId: string,
    data: Partial<{ name: LocalizedText; sortOrder: number; isActive: boolean }>
  ) {
    return MenuCategory.findOneAndUpdate(
      tenantQuery(tenantId, { _id: categoryId }),
      { $set: data },
      { new: true }
    );
  }

  static async deleteCategory(tenantId: string, categoryId: string) {
    const itemCount = await MenuItem.countDocuments(
      tenantQuery(tenantId, { categoryId })
    );
    if (itemCount > 0) {
      throw new Error('No se puede eliminar una categoría con ítems asignados');
    }
    return MenuCategory.findOneAndUpdate(
      tenantQuery(tenantId, { _id: categoryId }),
      { $set: { deletedAt: new Date(), isActive: false } },
      { new: true }
    );
  }

  static async listItems(tenantId: string, categoryId?: string) {
    const filter = categoryId ? { categoryId } : {};
    return MenuItem.find(tenantQuery(tenantId, filter)).sort({ sortOrder: 1 });
  }

  static async getItem(tenantId: string, itemId: string) {
    return MenuItem.findOne(tenantQuery(tenantId, { _id: itemId }));
  }

  static async createItem(tenantId: string, data: Record<string, unknown>) {
    const category = await MenuCategory.findOne(
      tenantQuery(tenantId, { _id: data.categoryId as string })
    );
    if (!category) {
      throw new Error('Categoría no encontrada');
    }

    return MenuItem.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      ...data,
    });
  }

  static async updateItem(
    tenantId: string,
    itemId: string,
    data: Record<string, unknown>
  ) {
    if (data.categoryId) {
      const category = await MenuCategory.findOne(
        tenantQuery(tenantId, { _id: data.categoryId as string })
      );
      if (!category) {
        throw new Error('Categoría no encontrada');
      }
    }

    return MenuItem.findOneAndUpdate(
      tenantQuery(tenantId, { _id: itemId }),
      { $set: data },
      { new: true }
    );
  }

  static async deleteItem(tenantId: string, itemId: string) {
    return MenuItem.findOneAndUpdate(
      tenantQuery(tenantId, { _id: itemId }),
      { $set: { deletedAt: new Date(), isAvailable: false } },
      { new: true }
    );
  }
}
