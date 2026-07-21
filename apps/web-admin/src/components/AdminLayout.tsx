import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { TenantConfigPublic } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { ImpersonationBanner } from './ImpersonationBanner';

const DEFAULT_ADMIN_TITLE = 'Admin — Bistró Digital';

/** Piloto restaurante: oculta Delivery IA / Meta / AFIP del menú (VITE_PILOT_CORE=true). */
const PILOT_CORE = import.meta.env.VITE_PILOT_CORE === 'true';

const navAll = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/orders', label: 'Pedidos', icon: '📋' },
  { to: '/menu', label: 'Menú', icon: '🍽️' },
  { to: '/tables', label: 'Mesas', icon: '🪑' },
  { to: '/stock', label: 'Stock', icon: '📦' },
  { to: '/users', label: 'Usuarios', icon: '👥' },
  { to: '/delivery', label: 'Delivery IA', icon: '🤖', advanced: true },
  { to: '/pilot-setup', label: 'Cliente piloto', icon: '🚀', advanced: true },
  { to: '/billing', label: 'Facturación AFIP', icon: '🧾', advanced: true },
  { to: '/settings', label: 'Configuración', icon: '⚙️' },
];

const nav = PILOT_CORE ? navAll.filter((item) => !item.advanced) : navAll;

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const tenantSlug = useAuthStore((s) => s.tenantSlug);
  const impersonation = useAuthStore((s) => s.impersonation);
  const isImpersonating = useAuthStore((s) => s.isImpersonating());
  const logout = useAuthStore((s) => s.logout);
  const exitImpersonation = useAuthStore((s) => s.exitImpersonation);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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

  const sidebar = (
    <>
      <div className="p-5 border-b border-white/10">
        <p className="font-bold">Bistró Digital</p>
        <p className="text-xs text-white/50">Panel Admin</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition ${
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
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <ImpersonationBanner />

      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-primary text-white border-b border-white/10">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-1 rounded-lg hover:bg-white/10"
          aria-label="Abrir menú"
        >
          <span className="block w-5 space-y-1" aria-hidden>
            <span className="block h-0.5 bg-white rounded" />
            <span className="block h-0.5 bg-white rounded" />
            <span className="block h-0.5 bg-white rounded" />
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">Bistró Digital</p>
          <p className="text-[10px] text-white/50 truncate">{user?.name}</p>
        </div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="flex flex-1 min-h-0 relative">
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-50 md:z-auto
            w-64 md:w-56 bg-primary text-white flex flex-col shrink-0
            transition-transform duration-200 ease-out
            ${menuOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none md:pointer-events-auto md:translate-x-0'}
          `}
        >
          <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10">
            <p className="font-bold text-sm">Menú</p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="text-white/70 hover:text-white px-2 py-1 text-sm"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          {sidebar}
        </aside>

        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
