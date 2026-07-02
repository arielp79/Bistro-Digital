import { Link } from 'react-router-dom';
import type { TenantAdminSettings } from '@bistro/shared-types';

interface PilotReadinessWidgetProps {
  settings: TenantAdminSettings;
}

export function PilotReadinessWidget({ settings }: PilotReadinessWidgetProps) {
  const { pilotStatus, metaStatus } = settings;

  if (pilotStatus.overallPercent >= 100) return null;

  const metaPartial = metaStatus.whatsappConnected || metaStatus.instagramConnected;

  return (
    <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-accent/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="text-3xl shrink-0" aria-hidden>
        🚀
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-primary">Cliente piloto — {pilotStatus.overallPercent}% listo</h2>
        <p className="text-sm text-primary/60 mt-1">
          {metaPartial || pilotStatus.afipConfigured
            ? 'Completá Meta, AFIP y la URL pública para activar delivery y facturación real.'
            : 'Configurá WhatsApp, Instagram y AFIP con las guías paso a paso del checklist.'}
        </p>
        <div className="h-1.5 bg-primary/10 rounded-full mt-3 overflow-hidden max-w-md">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${pilotStatus.overallPercent}%` }}
          />
        </div>
      </div>
      <Link
        to="/pilot-setup"
        className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:opacity-90 text-center shrink-0"
      >
        Ver checklist
      </Link>
    </div>
  );
}
