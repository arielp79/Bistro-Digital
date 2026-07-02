import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TenantAdminSettings } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';

function CheckRow({
  done,
  label,
  detail,
  action,
}: {
  done: boolean;
  label: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border ${
        done ? 'bg-green-50 border-green-200' : 'bg-surface border-primary/10'
      }`}
    >
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 ${
          done ? 'bg-green-600 text-white' : 'bg-primary/10 text-primary'
        }`}
      >
        {done ? '✓' : '·'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-primary/60 mt-0.5">{detail}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PilotSetupPage() {
  const [settings, setSettings] = useState<TenantAdminSettings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<TenantAdminSettings>('/api/v1/tenant/settings')
      .then(setSettings)
      .catch((e) => setError(e.message));
  }, []);

  const pilot = settings?.pilotStatus;
  const webhooks = settings?.webhooks;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Cliente piloto — Meta + AFIP</h1>
        <p className="text-sm text-primary/60 mt-2 max-w-2xl">
          Checklist para poner en marcha un restaurante real con Delivery IA por WhatsApp/Instagram y
          facturación electrónica AFIP. Cada ítem tiene su guía paso a paso en el panel.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {pilot && (
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-primary/60">Progreso general</span>
            <span className="font-medium">{pilot.overallPercent}%</span>
          </div>
          <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${pilot.overallPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <CheckRow
          done={Boolean(pilot?.publicApiReady)}
          label="API pública HTTPS (webhooks Meta)"
          detail={
            webhooks?.tunnelRequired
              ? 'En desarrollo: ejecutá npm run pilot:tunnel y configurá API_PUBLIC_URL en el servidor.'
              : `URL activa: ${webhooks?.publicApiUrl ?? '—'}`
          }
        />

        <CheckRow
          done={Boolean(pilot?.aiConfigured)}
          label="IA configurada (Delivery)"
          detail={
            pilot?.aiConfigured
              ? `Proveedor activo: ${pilot.aiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI'}`
              : 'El operador del SaaS debe setear GEMINI_API_KEY (o OPENAI_API_KEY) en apps/api/.env y reiniciar la API.'
          }
        />

        <CheckRow
          done={Boolean(pilot?.metaWhatsApp)}
          label="WhatsApp Cloud API"
          detail="Número Business, token permanente y webhook verificado en Meta Developers."
          action={
            <Link
              to="/connect-meta"
              className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:opacity-90"
            >
              {pilot?.metaWhatsApp ? 'Ver Meta' : 'Configurar'}
            </Link>
          }
        />

        <CheckRow
          done={Boolean(pilot?.metaInstagram)}
          label="Instagram Messaging"
          detail="Cuenta Professional, Page ID y webhook Instagram en la misma app Meta."
          action={
            <Link
              to="/connect-meta"
              className="px-4 py-2 text-sm rounded-xl border border-primary/10 hover:bg-primary/5"
            >
              {pilot?.metaInstagram ? 'Ver Meta' : 'Configurar'}
            </Link>
          }
        />

        <CheckRow
          done={Boolean(pilot?.afipConfigured)}
          label="Certificados AFIP"
          detail="CUIT, certificado .crt y clave .key de homologación o producción cargados en el panel."
          action={
            <Link
              to="/connect-afip"
              className="px-4 py-2 text-sm rounded-xl bg-primary text-white hover:opacity-90"
            >
              {pilot?.afipConfigured ? 'Ver AFIP' : 'Configurar'}
            </Link>
          }
        />

        <CheckRow
          done={Boolean(pilot?.afipEnabled)}
          label="AFIP habilitado"
          detail="Activá la integración real tras probar conexión en homologación. En producción (NODE_ENV=production) emite CAE fiscal."
          action={
            <Link
              to="/connect-afip"
              className="px-4 py-2 text-sm rounded-xl border border-primary/10 hover:bg-primary/5"
            >
              Habilitar
            </Link>
          }
        />
      </div>

      <section className="mt-8 bg-primary/5 border border-primary/10 rounded-xl p-5 text-sm space-y-2">
        <p className="font-medium">Flujo recomendado para el piloto</p>
        <ol className="list-decimal list-inside text-primary/70 space-y-1">
          <li>Operador SaaS: túnel HTTPS + GEMINI_API_KEY (o OPENAI_API_KEY)</li>
          <li>Restaurante: completar guía en Conectar Meta y probar mensaje desde el celular</li>
          <li>Restaurante: cargar certificados AFIP → Probar conexión → emitir factura B de prueba en Facturación</li>
          <li>Validar pedido end-to-end: WhatsApp → cocina → factura</li>
        </ol>
        <p className="text-primary/50 pt-2">
          Mientras tanto podés usar el{' '}
          <Link to="/delivery" className="text-primary underline">
            simulador Delivery IA
          </Link>{' '}
          sin credenciales Meta.
        </p>
      </section>
    </div>
  );
}
