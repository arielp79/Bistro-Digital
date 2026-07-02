import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function ImpersonationBanner() {
  const impersonation = useAuthStore((s) => s.impersonation);
  const exitImpersonation = useAuthStore((s) => s.exitImpersonation);
  const navigate = useNavigate();

  if (!impersonation) return null;

  const handleExit = async () => {
    await exitImpersonation();
    navigate('/platform');
  };

  return (
    <div className="bg-amber-400 text-amber-950 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
      <p>
        Estás viendo el panel como administrador de{' '}
        <strong>{impersonation.tenantName}</strong>
        <span className="text-amber-900/70 font-mono ml-1">({impersonation.tenantSlug})</span>
      </p>
      <button
        type="button"
        onClick={handleExit}
        className="px-3 py-1 rounded-lg bg-amber-950 text-amber-50 text-xs font-medium hover:bg-amber-900"
      >
        Volver a super-admin
      </button>
    </div>
  );
}
