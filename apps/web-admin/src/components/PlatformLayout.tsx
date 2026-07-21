import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { usePlatformAuthStore } from '../stores/platform-auth.store';

const PLATFORM_TITLE = 'Super-admin — Bistró Digital';

export function PlatformLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = usePlatformAuthStore((s) => s.user);
  const logout = usePlatformAuthStore((s) => s.logout);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.title = PLATFORM_TITLE;
    return () => {
      document.title = 'Admin — Bistró Digital';
    };
  }, []);

  const sidebar = (
    <>
      <div className="p-5 border-b border-white/10">
        <p className="font-bold">SaaS Plataforma</p>
        <p className="text-xs text-white/50">Super-admin</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavLink
          to="/platform"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition ${
              isActive ? 'bg-amber-400 text-slate-900 font-medium' : 'text-white/70 hover:bg-white/10'
            }`
          }
        >
          <span>🏢</span>
          Restaurantes
        </NavLink>
        <NavLink
          to="/platform/audit"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition ${
              isActive ? 'bg-amber-400 text-slate-900 font-medium' : 'text-white/70 hover:bg-white/10'
            }`
          }
        >
          <span>📋</span>
          Audit impersonación
        </NavLink>
      </nav>
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/50 truncate">{user?.name}</p>
        <button onClick={logout} className="text-xs text-white/70 hover:text-white mt-1">
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white border-b border-white/10">
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
          <p className="font-semibold text-sm truncate">Super-admin</p>
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
            w-64 md:w-56 bg-slate-900 text-white flex flex-col shrink-0
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

        <main className="flex-1 overflow-auto min-w-0 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
