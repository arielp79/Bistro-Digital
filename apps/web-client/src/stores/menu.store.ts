import type { MenuResponse } from '@bistro/shared-types';
import { create } from 'zustand';
import { useCartStore } from './cart.store';
import { useTenantStore } from './tenant.store';

function collectMenuItemIds(menu: MenuResponse): Set<string> {
  const ids = new Set<string>();
  for (const category of menu.categories) {
    for (const item of category.items) {
      ids.add(item.id);
    }
  }
  return ids;
}

interface MenuState {
  menu: MenuResponse | null;
  loading: boolean;
  error: string | null;
  loadMenu: (lang?: string) => Promise<void>;
}

export const useMenuStore = create<MenuState>((set) => ({
  menu: null,
  loading: false,
  error: null,

  loadMenu: async (lang?: string) => {
    const { slug, config } = useTenantStore.getState();
    if (!slug) {
      set({ loading: false, error: 'Restaurante no especificado' });
      return;
    }
    const resolvedLang = lang ?? config?.defaultLanguage ?? 'es';

    set({ loading: true, error: null });

    try {
      const res = await fetch(`/api/v1/menu?lang=${resolvedLang}`, {
        headers: { 'X-Tenant-ID': slug },
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? 'No se pudo cargar el menú');
      }

      set({ menu: json.data, loading: false });

      const removed = useCartStore
        .getState()
        .pruneStaleItems(collectMenuItemIds(json.data as MenuResponse));
      if (removed > 0) {
        console.info(`[Cart] Se quitaron ${removed} ítem(s) obsoleto(s) del carrito`);
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error desconocido',
        loading: false,
      });
    }
  },
}));
