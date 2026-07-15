import type { ImpersonateResponse, ImpersonationInfo, LoginResponse } from '@bistro/shared-types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  authLogin,
  setAccessToken,
  setRefreshToken,
  setTenantSlug,
} from '../lib/api';

/** Solo si se define VITE_TENANT_SLUG en build; sin demo hardcodeado. */
const DEFAULT_TENANT_SLUG = (import.meta.env.VITE_TENANT_SLUG as string | undefined)?.trim() ?? '';

interface AuthState {
  tenantSlug: string;
  accessToken: string | null;
  refreshToken: string | null;
  user: LoginResponse['user'] | null;
  impersonation: ImpersonationInfo | null;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  isImpersonating: () => boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  startImpersonation: (data: ImpersonateResponse) => void;
  exitImpersonation: () => Promise<void>;
  completeOnboarding: (result: {
    tenant: { slug: string };
    tokens: { accessToken: string; refreshToken: string };
    user: LoginResponse['user'];
  }) => void;
  applyTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tenantSlug: DEFAULT_TENANT_SLUG,
      accessToken: null,
      refreshToken: null,
      user: null,
      impersonation: null,

      isAuthenticated: () => !!get().accessToken,
      isAdmin: () => get().user?.role === 'admin',
      isImpersonating: () => !!get().impersonation,

      login: async (email, password, tenantSlug = get().tenantSlug) => {
        const { usePlatformAuthStore } = await import('./platform-auth.store');
        usePlatformAuthStore.getState().logout();

        const slug = tenantSlug.trim().toLowerCase();
        const data = await authLogin<LoginResponse>(
          '/api/v1/auth/login',
          { email, password },
          slug
        );
        if (data.user.role !== 'admin') {
          throw new Error('Solo administradores pueden acceder');
        }

        setTenantSlug(slug);
        setAccessToken(data.tokens.accessToken);
        setRefreshToken(data.tokens.refreshToken);
        set({
          tenantSlug: slug,
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
          user: data.user,
          impersonation: null,
        });
      },

      startImpersonation: (data) => {
        setTenantSlug(data.tenant.slug);
        setAccessToken(data.tokens.accessToken);
        setRefreshToken(data.tokens.refreshToken);
        set({
          tenantSlug: data.tenant.slug,
          accessToken: data.tokens.accessToken,
          refreshToken: data.tokens.refreshToken,
          user: data.user,
          impersonation: data.impersonation,
        });
      },

      exitImpersonation: async () => {
        const { impersonation } = get();
        const { usePlatformAuthStore } = await import('./platform-auth.store');
        const platform = usePlatformAuthStore.getState();

        if (impersonation?.auditLogId && platform.accessToken) {
          try {
            const { platformFetch } = await import('../lib/api');
            await platformFetch(`/api/v1/platform/impersonation-logs/${impersonation.auditLogId}/end`, {
              method: 'POST',
            });
          } catch {
            // No bloquear salida del panel si falla el cierre del audit
          }
        }

        setAccessToken(null);
        setRefreshToken(null);
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          impersonation: null,
        });

        if (platform.accessToken) {
          setAccessToken(platform.accessToken);
          setRefreshToken(platform.refreshToken);
        }
      },

      completeOnboarding: (result) => {
        setTenantSlug(result.tenant.slug);
        setAccessToken(result.tokens.accessToken);
        setRefreshToken(result.tokens.refreshToken);
        set({
          tenantSlug: result.tenant.slug,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          user: result.user,
          impersonation: null,
        });
      },

      applyTokens: (accessToken, refreshToken) => {
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        set({ accessToken, refreshToken });
      },

      logout: () => {
        const wasImpersonating = get().isImpersonating();
        setAccessToken(null);
        setRefreshToken(null);
        set({ accessToken: null, refreshToken: null, user: null, impersonation: null });
        if (wasImpersonating) {
          void import('./platform-auth.store').then(({ usePlatformAuthStore }) => {
            const platform = usePlatformAuthStore.getState();
            if (platform.accessToken) {
              setAccessToken(platform.accessToken);
              setRefreshToken(platform.refreshToken);
            }
          });
        }
      },
    }),
    {
      name: 'bistro-admin-auth',
      version: 1,
      migrate: (persisted) => {
        const state = persisted as Partial<AuthState> | undefined;
        if (!state) return state as AuthState;
        // Limpiar slug demo antiguo si no hay sesión activa
        if (state.tenantSlug === 'bistro-digital' && !state.accessToken) {
          return { ...state, tenantSlug: DEFAULT_TENANT_SLUG };
        }
        return state as AuthState;
      },
      onRehydrateStorage: () => (state) => {
        if (state?.tenantSlug) setTenantSlug(state.tenantSlug);
        else setTenantSlug(DEFAULT_TENANT_SLUG);
        if (state?.accessToken) setAccessToken(state.accessToken);
        if (state?.refreshToken) setRefreshToken(state.refreshToken);
      },
    }
  )
);
