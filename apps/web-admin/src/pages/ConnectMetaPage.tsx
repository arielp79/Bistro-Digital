import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TenantAdminSettings, WhatsAppTestResult, InstagramTestResult } from '@bistro/shared-types';
import { CopyField } from '../components/CopyField';
import { apiFetch } from '../lib/api';

function StepBadge({ done, n }: { done: boolean; n: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold shrink-0 ${
        done ? 'bg-green-600 text-white' : 'bg-primary/10 text-primary'
      }`}
    >
      {done ? '✓' : n}
    </span>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full ${
        ok ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
      }`}
    >
      {label}
    </span>
  );
}

export function ConnectMetaPage() {
  const [settings, setSettings] = useState<TenantAdminSettings | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [webhookToken, setWebhookToken] = useState('');
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [instagramPageId, setInstagramPageId] = useState('');
  const [instagramAccessToken, setInstagramAccessToken] = useState('');

  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestMessage, setWaTestMessage] = useState('Hola, prueba de WhatsApp desde Bistró Digital');
  const [waTestResult, setWaTestResult] = useState<string | null>(null);
  const [waTestLoading, setWaTestLoading] = useState(false);

  const [igRecipientId, setIgRecipientId] = useState('');
  const [igTestMessage, setIgTestMessage] = useState('Hola, prueba de Instagram desde Bistró Digital');
  const [igTestResult, setIgTestResult] = useState<string | null>(null);
  const [igTestLoading, setIgTestLoading] = useState(false);

  const loadSettings = () => {
    apiFetch<TenantAdminSettings>('/api/v1/tenant/settings')
      .then((s) => {
        setSettings(s);
        setWebhookToken(s.integrations.whatsappWebhookToken);
        setWhatsappPhoneNumberId(s.integrations.whatsappPhoneNumberId);
        setInstagramPageId(s.integrations.instagramPageId);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const progress = useMemo(() => {
    if (!settings) return 0;
    const steps = [
      settings.metaStatus.metaAppReady,
      !settings.webhooks.tunnelRequired || settings.webhooks.publicApiUrl.startsWith('https://'),
      settings.metaStatus.whatsappConnected,
      settings.metaStatus.instagramConnected,
    ];
    const done = steps.filter(Boolean).length;
    return Math.round((done / steps.length) * 100);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const integrations: Record<string, string> = {
        whatsappPhoneNumberId,
        whatsappWebhookToken: webhookToken,
        instagramPageId,
      };
      if (whatsappAccessToken.trim()) integrations.whatsappAccessToken = whatsappAccessToken;
      if (instagramAccessToken.trim()) integrations.instagramAccessToken = instagramAccessToken;

      const updated = await apiFetch<TenantAdminSettings>('/api/v1/tenant/config', {
        method: 'PATCH',
        body: JSON.stringify({ integrations }),
      });
      setSettings(updated);
      setWhatsappAccessToken('');
      setInstagramAccessToken('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const sendWaTest = async () => {
    setWaTestLoading(true);
    setWaTestResult(null);
    setError('');
    try {
      const result = await apiFetch<WhatsAppTestResult>('/api/v1/delivery/whatsapp/test', {
        method: 'POST',
        body: JSON.stringify({ phone: waTestPhone, message: waTestMessage }),
      });
      setWaTestResult(
        result.mode === 'live'
          ? `WhatsApp enviado (${result.messageId ?? 'ok'})`
          : 'Modo dev: revisá logs de la API (faltan tokens)'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en prueba WhatsApp');
    } finally {
      setWaTestLoading(false);
    }
  };

  const sendIgTest = async () => {
    setIgTestLoading(true);
    setIgTestResult(null);
    setError('');
    try {
      const result = await apiFetch<InstagramTestResult>('/api/v1/delivery/instagram/test', {
        method: 'POST',
        body: JSON.stringify({ recipientId: igRecipientId, message: igTestMessage }),
      });
      setIgTestResult(
        result.mode === 'live' ? 'Instagram enviado' : 'Modo dev: revisá logs de la API (faltan tokens)'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en prueba Instagram');
    } finally {
      setIgTestLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link to="/pilot-setup" className="text-sm text-primary/50 hover:text-primary">
          ← Cliente piloto
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Conectar Meta (WhatsApp e Instagram)</h1>
        <p className="text-sm text-primary/60 mt-2 max-w-2xl">
          Cada restaurante usa <strong>su propia cuenta Meta Business</strong>. Vos no necesitás una app Meta
          propia: el cliente crea la app, conecta su número WhatsApp y su cuenta Instagram Professional, y pega
          los datos acá. WhatsApp e Instagram comparten la misma app en Meta Developers y el mismo Verify Token.
        </p>
      </div>

      {settings && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatusPill
            ok={settings.metaStatus.whatsappConnected}
            label={settings.metaStatus.whatsappConnected ? 'WhatsApp listo' : 'WhatsApp pendiente'}
          />
          <StatusPill
            ok={settings.metaStatus.instagramConnected}
            label={settings.metaStatus.instagramConnected ? 'Instagram listo' : 'Instagram pendiente'}
          />
          <Link to="/delivery" className="text-sm text-primary underline underline-offset-2">
            Probar IA sin Meta → Simulador
          </Link>
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-primary/60">Progreso de conexión</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {saved && <p className="text-green-600 text-sm mb-4">Credenciales guardadas</p>}

      <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
        {/* Paso 1 */}
        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <div className="flex gap-3">
            <StepBadge done={Boolean(settings?.metaStatus.metaAppReady)} n={1} />
            <div className="space-y-2 flex-1">
              <h2 className="font-semibold">Cuenta Meta del restaurante</h2>
              <p className="text-sm text-primary/60">
                El cliente necesita una{' '}
                <a
                  href="https://business.facebook.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Meta Business Suite
                </a>{' '}
                con permisos de administrador.
              </p>
              <ul className="text-sm text-primary/60 list-disc list-inside space-y-1">
                <li>WhatsApp Business: número verificado en la app</li>
                <li>Instagram: cuenta Professional vinculada a una Página de Facebook</li>
                <li>App en{' '}
                  <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="underline">
                    Meta Developers
                  </a>{' '}
                  con productos WhatsApp + Instagram / Messenger
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Paso 2 — Webhooks compartidos */}
        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <div className="flex gap-3">
            <StepBadge
              done={Boolean(settings && !settings.webhooks.tunnelRequired)}
              n={2}
            />
            <div className="space-y-4 flex-1">
              <h2 className="font-semibold">Webhooks (misma app Meta, dos URLs)</h2>
              <p className="text-sm text-primary/60">
                Meta avisa a tu servidor cuando llega un mensaje. En producción usás el dominio del SaaS; en
                desarrollo necesitás un túnel HTTPS (
                <code className="text-xs bg-primary/5 px-1 rounded">npm run tunnel:whatsapp</code>).
              </p>

              {settings?.webhooks.tunnelRequired && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950">
                  <p className="font-medium">URL pública pendiente</p>
                  <p className="mt-1">
                    Configurá <code className="bg-white/70 px-1 rounded">API_PUBLIC_URL</code> en el servidor
                    del SaaS con la URL HTTPS del túnel y reiniciá la API.
                  </p>
                </div>
              )}

              {settings?.webhooks && (
                <>
                  <CopyField
                    label="Webhook WhatsApp (Meta → WhatsApp → Configuration)"
                    value={settings.webhooks.whatsappUrl}
                    hint="Suscribí el campo messages"
                  />
                  <CopyField
                    label="Webhook Instagram (Meta → Instagram o Messenger)"
                    value={settings.webhooks.instagramUrl}
                    hint="Suscribí messages y messaging_postbacks"
                  />
                  <CopyField
                    label="Verify Token (igual en ambos webhooks)"
                    value={settings.webhooks.metaVerifyToken}
                  />
                </>
              )}

              <div>
                <label className="text-sm text-primary/50">Verify Token personalizado (opcional)</label>
                <input
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                  placeholder="bistro-dev-verify"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
                <p className="text-xs text-primary/40 mt-1">
                  El restaurante elige una clave y la repite en Meta al verificar cada webhook.
                </p>
              </div>

              {settings?.webhooks.signatureVerification && (
                <p className="text-xs text-primary/50">
                  El operador del SaaS configuró WHATSAPP_APP_SECRET — las firmas Meta se validan en el servidor.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Paso 3 — WhatsApp */}
        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <div className="flex gap-3">
            <StepBadge done={Boolean(settings?.metaStatus.whatsappConnected)} n={3} />
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">WhatsApp Cloud API</h2>
                {settings && (
                  <StatusPill
                    ok={settings.metaStatus.whatsappConnected}
                    label={settings.metaStatus.whatsappConnected ? 'Conectado' : 'Pendiente'}
                  />
                )}
              </div>
              <ol className="text-sm text-primary/60 list-decimal list-inside space-y-1">
                <li>En la app Meta: producto WhatsApp → API Setup</li>
                <li>Copiá Phone Number ID y generá un Access Token permanente</li>
                <li>Configurá el webhook de WhatsApp (paso 2) y verificá</li>
                <li>Pegá los datos abajo y guardá</li>
                <li>Escribí al número Business desde tu celular — la IA debería responder</li>
              </ol>
              <div>
                <label className="text-sm text-primary/50">Phone Number ID</label>
                <input
                  value={whatsappPhoneNumberId}
                  onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                  placeholder="123456789012345"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-primary/50">Access Token permanente</label>
                <input
                  type="password"
                  placeholder={
                    settings?.integrations.whatsappConfigured ? '•••• configurado' : 'EAAxxxx...'
                  }
                  value={whatsappAccessToken}
                  onChange={(e) => setWhatsappAccessToken(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
              </div>
              <div className="border-t border-primary/10 pt-4 space-y-3">
                <h3 className="text-sm font-medium">Probar envío WhatsApp</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    value={waTestPhone}
                    onChange={(e) => setWaTestPhone(e.target.value)}
                    placeholder="54911xxxxxxxx"
                    className="px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                  />
                  <input
                    value={waTestMessage}
                    onChange={(e) => setWaTestMessage(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={waTestLoading || !waTestPhone.trim()}
                  onClick={() => void sendWaTest()}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-50"
                >
                  {waTestLoading ? 'Enviando...' : 'Enviar prueba'}
                </button>
                {waTestResult && <p className="text-sm text-green-700">{waTestResult}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* Paso 4 — Instagram */}
        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <div className="flex gap-3">
            <StepBadge done={Boolean(settings?.metaStatus.instagramConnected)} n={4} />
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Instagram Messaging</h2>
                {settings && (
                  <StatusPill
                    ok={settings.metaStatus.instagramConnected}
                    label={settings.metaStatus.instagramConnected ? 'Conectado' : 'Pendiente'}
                  />
                )}
              </div>
              <p className="text-sm text-primary/60">
                Instagram usa la <strong>misma app Meta</strong> que WhatsApp. Los mensajes directos (DM) de la
                cuenta Professional llegan vía webhook de Instagram/Messenger. Necesitás la Página de Facebook
                vinculada al perfil de Instagram.
              </p>
              <ol className="text-sm text-primary/60 list-decimal list-inside space-y-1">
                <li>Instagram → Configuración → Mensajes → Permitir acceso a mensajes</li>
                <li>En Meta Developers: vinculá la Página FB + cuenta IG a la app</li>
                <li>Webhook Instagram (paso 2) — mismo Verify Token</li>
                <li>Copiá el Page ID (de la Página de Facebook, no el @usuario de IG)</li>
                <li>Usá el mismo Access Token de la app o uno con permisos instagram_manage_messages</li>
              </ol>
              <div>
                <label className="text-sm text-primary/50">Facebook Page ID</label>
                <input
                  value={instagramPageId}
                  onChange={(e) => setInstagramPageId(e.target.value)}
                  placeholder="123456789012345"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-primary/50">Access Token (mismo de la app o dedicado)</label>
                <input
                  type="password"
                  placeholder={
                    settings?.integrations.instagramConfigured ? '•••• configurado' : 'EAAxxxx...'
                  }
                  value={instagramAccessToken}
                  onChange={(e) => setInstagramAccessToken(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
              </div>
              <div className="border-t border-primary/10 pt-4 space-y-3">
                <h3 className="text-sm font-medium">Probar envío Instagram (opcional)</h3>
                <p className="text-xs text-primary/50">
                  El ID del destinatario (PSID) aparece en los logs de la API cuando alguien te escribe por
                  Instagram por primera vez. Hasta entonces, probá enviando un DM a la cuenta del restaurante.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    value={igRecipientId}
                    onChange={(e) => setIgRecipientId(e.target.value)}
                    placeholder="ID destinatario (PSID)"
                    className="px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                  />
                  <input
                    value={igTestMessage}
                    onChange={(e) => setIgTestMessage(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={igTestLoading || !igRecipientId.trim()}
                  onClick={() => void sendIgTest()}
                  className="px-4 py-2 rounded-xl border border-primary/10 text-sm hover:bg-primary/5 disabled:opacity-50"
                >
                  {igTestLoading ? 'Enviando...' : 'Enviar prueba Instagram'}
                </button>
                {igTestResult && <p className="text-sm text-green-700">{igTestResult}</p>}
              </div>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-primary text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar credenciales Meta'}
        </button>
      </form>
    </div>
  );
}
