import type { LoginResponse } from '@bistro/shared-types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  authLogin,
  setAccessToken,
  setRefreshToken,
  setOnAuthFailure,
  setOnTokensRefreshed,
} from '../lib/api';

const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG ?? 'bistro-digital';

interface AuthState {
  tenantSlug: string;
  accessToken: string | null;
  refreshToken: string | null;
  user: LoginResponse['user'] | null;
  isAuthenticated: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  applyTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tenantSlug: TENANT_SLUG,
      accessToken: null,
      refreshToken: null,
      user: null,

      isAuthenticated: () => !!get().accessToken && !!get().user?.tenantId,

      login: async (email, password) => {
        const data = await authLogin<LoginResponse>(email, password);
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
      name: 'bistro-kitchen-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) setAccessToken(state.accessToken);
        if (state?.refreshToken) setRefreshToken(state.refreshToken);
      },
    }
  )
);

setOnTokensRefreshed(({ accessToken, refreshToken }) => {
  useAuthStore.getState().applyTokens(accessToken, refreshToken);
});

setOnAuthFailure(() => {
  useAuthStore.getState().logout();
});
