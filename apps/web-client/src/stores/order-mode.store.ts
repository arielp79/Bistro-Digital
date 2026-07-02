import { create } from 'zustand';
import type { OrderType } from '@bistro/shared-types';

const MODE_KEY = 'bistro_order_mode';

interface OrderModeState {
  mode: OrderType;
  setMode: (mode: OrderType) => void;
  initFromUrl: (searchParams: URLSearchParams) => void;
}

export const useOrderModeStore = create<OrderModeState>((set) => ({
  mode: (sessionStorage.getItem(MODE_KEY) as OrderType) || 'dine-in',

  setMode: (mode) => {
    sessionStorage.setItem(MODE_KEY, mode);
    set({ mode });
  },

  initFromUrl: (searchParams) => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'delivery') {
      sessionStorage.setItem(MODE_KEY, 'delivery');
      set({ mode: 'delivery' });
    } else if (modeParam === 'dine-in' || searchParams.get('table')) {
      sessionStorage.setItem(MODE_KEY, 'dine-in');
      set({ mode: 'dine-in' });
    }
  },
}));

export function isDeliveryMode(mode: OrderType): boolean {
  return mode === 'delivery';
}
