import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { TenantConfigPublic } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { ImpersonationBanner } from './ImpersonationBanner';

const DEFAULT_ADMIN_TITLE = 'Admin — Bistró Digital';

const nav = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/orders', label: 'Pedidos', icon: '📋' },
  { to: '/menu', label: 'Menú', icon: '🍽️' },
  { to: '/tables', label: 'Mesas', icon: '🪑' },
  { to: '/stock', label: 'Stock', icon: '📦' },
  { to: '/users', label: 'Usuarios', icon: '👥' },
  { to: '/delivery', label: 'Delivery IA', icon: '🤖' },
  { to: '/pilot-setup', label: 'Cliente piloto', icon: '🚀' },
  { to: '/billing', label: 'Facturación', icon: '🧾' },
  { to: '/settings', label: 'Configuración', icon: '⚙️' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tenantSlug = useAuthStore((s) => s.tenantSlug);
  const impersonation = useAuthStore((s) => s.impersonation);
  const isImpersonating = useAuthStore((s) => s.isImpersonating());
  const logout = useAuthStore((s) => s.logout);
  const exitImpersonation = useAuthStore((s) => s.exitImpersonation);

  useEffect(() => {
    if (impersonation) {
      document.title = `Admin — ${impersonation.tenantName}`;
      return;
    }

    let cancelled = false;
    void apiFetch<TenantConfigPublic>('/api/v1/tenant/config')
      .then((config) => {
        if (!cancelled) document.title = `Admin — ${config.name}`;
      })
      .catch(() => {
        if (!cancelled) document.title = DEFAULT_ADMIN_TITLE;
      });

    return () => {
      cancelled = true;
      document.title = DEFAULT_ADMIN_TITLE;
    };
  }, [impersonation, tenantSlug]);

  const handleExitImpersonation = async () => {
    await exitImpersonation();
    navigate('/platform');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ImpersonationBanner />
      <div className="flex flex-1 min-h-0">
      <aside className="w-56 bg-primary text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <p className="font-bold">Bistró Digital</p>
          <p className="text-xs text-white/50">Panel Admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? 'bg-accent text-primary font-medium' : 'text-white/70 hover:bg-white/10'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/50 truncate">{user?.name}</p>
          {isImpersonating ? (
            <button
              onClick={handleExitImpersonation}
              className="text-xs text-white/70 hover:text-white mt-1"
            >
              Volver a super-admin
            </button>
          ) : (
            <button onClick={logout} className="text-xs text-white/70 hover:text-white mt-1">
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      </div>
    </div>
  );
}
