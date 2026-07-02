import type { CartLineItem, MenuItemPublic, SelectedModifier } from '@bistro/shared-types';
import { validateModifiers } from '../utils/modifiers';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  items: CartLineItem[];
  addItem: (
    menuItem: MenuItemPublic,
    selectedModifiers: SelectedModifier[],
    quantity?: number,
    notes?: string
  ) => { success: boolean; error?: string };
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  pruneStaleItems: (validMenuItemIds: Set<string>) => number;
  itemCount: () => number;
  subtotal: () => number;
}

function calcUnitPrice(menuItem: MenuItemPublic, modifiers: SelectedModifier[]): number {
  return menuItem.basePrice + modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (menuItem, selectedModifiers, quantity = 1, notes = '') => {
        const selections = selectedModifiers.map((m) => ({
          groupId: m.groupId,
          optionId: m.optionId,
        }));

        const valid = validateModifiers(menuItem.modifierGroups, selections);
        if (!valid) {
          return { success: false, error: 'Seleccioná las opciones requeridas' };
        }

        const unitPrice = calcUnitPrice(menuItem, selectedModifiers);
        const line: CartLineItem = {
          lineId: crypto.randomUUID(),
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity,
          unitPrice,
          basePrice: menuItem.basePrice,
          selectedModifiers,
          notes,
        };

        set((state) => ({ items: [...state.items, line] }));
        return { success: true };
      },

      removeItem: (lineId) => {
        set((state) => ({ items: state.items.filter((i) => i.lineId !== lineId) }));
      },

      updateQuantity: (lineId, quantity) => {
        if (quantity < 1) {
          get().removeItem(lineId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) => (i.lineId === lineId ? { ...i, quantity } : i)),
        }));
      },

      clear: () => set({ items: [] }),

      pruneStaleItems: (validMenuItemIds) => {
        let removed = 0;
        set((state) => {
          const items = state.items.filter((i) => {
            const ok = validMenuItemIds.has(i.menuItemId);
            if (!ok) removed += 1;
            return ok;
          });
          return { items };
        });
        return removed;
      },

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    }),
    { name: 'bistro-cart', version: 2 }
  )
);
