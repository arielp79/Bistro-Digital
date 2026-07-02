import { create } from 'zustand';
import { useTenantStore } from './tenant.store';

interface SessionState {
  tableId: string | null;
  tableLabel: string | null;
  setTable: (tableId: string, label?: string) => void;
  clearTable: () => void;
  initFromUrl: (searchParams: URLSearchParams) => Promise<void>;
}

const TABLE_KEY = 'bistro_table_id';
const TABLE_LABEL_KEY = 'bistro_table_label';

export const useSessionStore = create<SessionState>((set, get) => ({
  tableId: sessionStorage.getItem(TABLE_KEY),
  tableLabel: sessionStorage.getItem(TABLE_LABEL_KEY),

  setTable: (tableId, label) => {
    sessionStorage.setItem(TABLE_KEY, tableId);
    if (label) sessionStorage.setItem(TABLE_LABEL_KEY, label);
    set({ tableId, tableLabel: label ?? get().tableLabel });
  },

  clearTable: () => {
    sessionStorage.removeItem(TABLE_KEY);
    sessionStorage.removeItem(TABLE_LABEL_KEY);
    set({ tableId: null, tableLabel: null });
  },

  initFromUrl: async (searchParams) => {
    const tableId = searchParams.get('table');
    const tenant = searchParams.get('tenant');

    if (!tableId) return;

    const { slug } = useTenantStore.getState();
    const tenantSlug = tenant ?? slug;
    if (!tenantSlug) return;

    try {
      const res = await fetch(`/api/v1/tables/${tableId}`, {
        headers: { 'X-Tenant-ID': tenantSlug },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        get().setTable(tableId, json.data.label);
      } else if (res.status === 404) {
        get().clearTable();
      } else {
        get().setTable(tableId);
      }
    } catch {
      get().setTable(tableId);
    }
  },
}));
