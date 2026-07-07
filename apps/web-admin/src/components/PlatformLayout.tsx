import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { usePlatformAuthStore } from '../stores/platform-auth.store';

const PLATFORM_TITLE = 'Super-admin — Bistró Digital';

export function PlatformLayout() {
  const user = usePlatformAuthStore((s) => s.user);
  const logout = usePlatformAuthStore((s) => s.logout);

  useEffect(() => {
    document.title = PLATFORM_TITLE;
    return () => {
      document.title = 'Admin — Bistró Digital';
    };
  }, []);

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <p className="font-bold">SaaS Plataforma</p>
          <p className="text-xs text-white/50">Super-admin</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink
            to="/platform"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
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
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
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
      </aside>
      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}
