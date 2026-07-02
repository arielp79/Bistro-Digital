import type { LoginResponse } from '@bistro/shared-types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  platformLogin as apiPlatformLogin,
  setAccessToken,
  setRefreshToken,
} from '../lib/api';

interface PlatformAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: LoginResponse['user'] | null;
  isAuthenticated: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  applyTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const usePlatformAuthStore = create<PlatformAuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      isAuthenticated: () => !!get().accessToken && get().user?.role === 'platform_admin',

      login: async (email, password) => {
        const { useAuthStore } = await import('./auth.store');
        useAuthStore.getState().logout();

        const data = await apiPlatformLogin<LoginResponse>('/api/v1/platform/auth/login', {
          email,
          password,
        });

        if (data.user.role !== 'platform_admin') {
          throw new Error('Solo operadores de plataforma pueden acceder');
        }

        setAccessToken(data.tokens.accessToken);
        setRefreshToken(data.tokens.refreshToken);
        set({
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
          user: data.user,
        });
      },

      applyTokens: (accessToken, refreshToken) => {
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        set({ accessToken, refreshToken });
      },

      logout: () => {
        setAccessToken(null);
        setRefreshToken(null);
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: 'bistro-platform-auth',
      onRehydrateStorage: () => (state) => {
        if (!state?.accessToken) return;
        void import('./auth.store').then(({ useAuthStore }) => {
          if (useAuthStore.getState().isImpersonating()) return;
          setAccessToken(state.accessToken);
          if (state.refreshToken) setRefreshToken(state.refreshToken);
        });
      },
    }
  )
);
