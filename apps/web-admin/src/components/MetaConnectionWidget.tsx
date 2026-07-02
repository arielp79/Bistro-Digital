import { Link } from 'react-router-dom';
import type { TenantAdminSettings } from '@bistro/shared-types';

interface MetaConnectionWidgetProps {
  settings: TenantAdminSettings;
}

export function MetaConnectionWidget({ settings }: MetaConnectionWidgetProps) {
  const { whatsappConnected, instagramConnected, deliveryReady } = settings.metaStatus;

  if (deliveryReady) return null;

  const partial = whatsappConnected || instagramConnected;

  return (
    <div
      className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
        partial
          ? 'bg-amber-50 border-amber-200'
          : 'bg-primary/5 border-primary/15'
      }`}
    >
      <div className="text-3xl shrink-0" aria-hidden>
        {partial ? '⚠️' : '💬'}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-primary">
          {partial ? 'Conexión Meta incompleta' : 'Meta no conectado'}
        </h2>
        <p className="text-sm text-primary/60 mt-1">
          {partial ? (
            <>
              {!whatsappConnected && 'Falta configurar WhatsApp. '}
              {!instagramConnected && 'Falta configurar Instagram. '}
              Completá la guía para recibir pedidos por mensaje directo.
            </>
          ) : (
            <>
              WhatsApp e Instagram usan la cuenta Meta del restaurante. Conectalos para que la IA
              atienda pedidos por mensaje — o usá el simulador en Delivery IA mientras tanto.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <span
            className={`px-2 py-1 rounded-full ${
              whatsappConnected ? 'bg-green-100 text-green-800' : 'bg-white/80 text-primary/50'
            }`}
          >
            WhatsApp {whatsappConnected ? '✓' : 'pendiente'}
          </span>
          <span
            className={`px-2 py-1 rounded-full ${
              instagramConnected ? 'bg-green-100 text-green-800' : 'bg-white/80 text-primary/50'
            }`}
          >
            Instagram {instagramConnected ? '✓' : 'pendiente'}
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:items-end gap-2 shrink-0">
        <Link
          to="/pilot-setup"
          className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:opacity-90 text-center"
        >
          Conectar Meta
        </Link>
        <Link to="/delivery" className="text-xs text-primary/50 hover:text-primary underline">
          Probar sin Meta → Simulador
        </Link>
      </div>
    </div>
  );
}
