import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { StripeCheckoutSession, TenantAdminSettings, TenantPlan } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';

const PLAN_LABELS: Record<TenantPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const billingNotice = searchParams.get('billing');
  const checkoutSessionId = searchParams.get('session_id');
  const [settings, setSettings] = useState<TenantAdminSettings | null>(null);
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1A1A2E');
  const [accentColor, setAccentColor] = useState('#E8C468');
  const [defaultLanguage, setDefaultLanguage] = useState<'es' | 'en' | 'pt'>('es');
  const [paymentMethods, setPaymentMethods] = useState({
    cash: true,
    transfer: true,
    mercadopago: false,
    stripe: false,
  });
  const [mercadopagoAccessToken, setMercadopagoAccessToken] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [billingLoading, setBillingLoading] = useState<'pro' | 'enterprise' | 'portal' | 'sync' | null>(null);

  const loadSettings = () => {
    apiFetch<TenantAdminSettings>('/api/v1/tenant/settings')
      .then((s) => {
        setSettings(s);
        setName(s.name);
        setPrimaryColor(s.branding.primaryColor);
        setAccentColor(s.branding.accentColor);
        setDefaultLanguage(s.defaultLanguage as 'es' | 'en' | 'pt');
        setPaymentMethods(s.paymentMethods);
        setCustomDomain(s.domainSettings.isCustomDomain ? s.domainSettings.domain : '');
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (billingNotice === 'success' && checkoutSessionId) {
      setError('');
      void apiFetch<{ plan: TenantPlan }>('/api/v1/subscriptions/confirm', {
        method: 'POST',
        body: JSON.stringify({ sessionId: checkoutSessionId }),
      })
        .then(() => loadSettings())
        .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo confirmar el pago'));
      return;
    }

    if (billingNotice === 'success' || billingNotice === 'cancel') {
      loadSettings();
    }
  }, [billingNotice, checkoutSessionId]);

  const startCheckout = async (plan: 'pro' | 'enterprise') => {
    setBillingLoading(plan);
    setError('');
    try {
      const session = await apiFetch<StripeCheckoutSession>('/api/v1/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago');
      setBillingLoading(null);
    }
  };

  const syncBilling = async () => {
    setBillingLoading('sync');
    setError('');
    try {
      await apiFetch<{ plan: TenantPlan }>('/api/v1/subscriptions/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo sincronizar con Stripe');
    } finally {
      setBillingLoading(null);
    }
  };

  const openPortal = async () => {
    setBillingLoading('portal');
    setError('');
    try {
      const session = await apiFetch<{ url: string }>('/api/v1/subscriptions/portal', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el portal de Stripe');
      setBillingLoading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const integrations: Record<string, string> = {};
      if (mercadopagoAccessToken.trim()) integrations.mercadopagoAccessToken = mercadopagoAccessToken;

      const updated = await apiFetch<TenantAdminSettings>('/api/v1/tenant/config', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          branding: { primaryColor, accentColor },
          defaultLanguage,
          paymentMethods,
          integrations,
          ...(customDomain.trim()
            ? { domain: customDomain.trim() }
            : settings?.domainSettings.isCustomDomain
              ? { domain: settings.domainSettings.defaultSubdomain }
              : {}),
        }),
      });
      setSettings(updated);
      setCustomDomain(updated.domainSettings.isCustomDomain ? updated.domainSettings.domain : '');
      setMercadopagoAccessToken('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {saved && <p className="text-green-600 text-sm mb-4">Configuración guardada</p>}
      {billingNotice === 'success' && (
        <p className="text-green-600 text-sm mb-4">
          Pago recibido. Tu plan se actualizará en unos segundos (webhook Stripe).
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setSearchParams({})}
          >
            Cerrar
          </button>
        </p>
      )}
      {billingNotice === 'cancel' && (
        <p className="text-amber-700 text-sm mb-4">
          Pago cancelado en Stripe.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setSearchParams({})}
          >
            Cerrar
          </button>
        </p>
      )}

      {settings?.saasBilling && (
        <section className="mb-6 rounded-xl bg-surface border border-primary/10 p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Plan SaaS</h2>
              <p className="text-sm text-primary/60 mt-1">
                Plan actual: <strong>{PLAN_LABELS[settings.saasBilling.plan]}</strong>
                {settings.saasBilling.subscriptionStatus && (
                  <span className="text-primary/40">
                    {' '}
                    · Stripe: {settings.saasBilling.subscriptionStatus}
                  </span>
                )}
              </p>
            </div>
          </div>
          {!settings.saasBilling.stripeConfigured && (
            <p className="text-xs text-primary/50">
              Stripe no está configurado en el servidor (STRIPE_SECRET_KEY).
            </p>
          )}
          {settings.saasBilling.stripeConfigured && (
            <div className="flex flex-wrap gap-2">
              {settings.saasBilling.plan !== 'pro' && (
                <button
                  type="button"
                  disabled={billingLoading !== null}
                  onClick={() => void startCheckout('pro')}
                  className="px-4 py-2 text-sm rounded-xl bg-primary text-white disabled:opacity-50"
                >
                  {billingLoading === 'pro' ? 'Redirigiendo...' : 'Upgrade a Pro'}
                </button>
              )}
              {settings.saasBilling.plan !== 'enterprise' && (
                <button
                  type="button"
                  disabled={billingLoading !== null}
                  onClick={() => void startCheckout('enterprise')}
                  className="px-4 py-2 text-sm rounded-xl border border-primary/10 disabled:opacity-50"
                >
                  {billingLoading === 'enterprise' ? 'Redirigiendo...' : 'Upgrade a Enterprise'}
                </button>
              )}
              {settings.saasBilling.canManagePortal && (
                <button
                  type="button"
                  disabled={billingLoading !== null}
                  onClick={() => void openPortal()}
                  className="px-4 py-2 text-sm rounded-xl border border-primary/10 disabled:opacity-50"
                >
                  {billingLoading === 'portal' ? 'Abriendo...' : 'Gestionar suscripción'}
                </button>
              )}
              {settings.saasBilling.plan === 'starter' && settings.saasBilling.stripeConfigured && (
                <button
                  type="button"
                  disabled={billingLoading !== null}
                  onClick={() => void syncBilling()}
                  className="px-4 py-2 text-sm rounded-xl border border-primary/10 disabled:opacity-50"
                >
                  {billingLoading === 'sync' ? 'Sincronizando...' : 'Sincronizar plan con Stripe'}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <div className="mb-6 rounded-xl bg-primary/5 border border-primary/10 p-4 text-sm">
        <p className="font-medium">WhatsApp e Instagram</p>
        <p className="text-primary/60 mt-1">
          La conexión con Meta (credenciales del cliente, webhooks y pruebas) está en{' '}
          <Link to="/connect-meta" className="text-primary underline underline-offset-2">
            Conectar Meta
          </Link>
          .
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <h2 className="font-semibold">General</h2>
          <div>
            <label className="text-sm text-primary/50">Nombre del restaurante</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-primary/50">Idioma por defecto</label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value as 'es' | 'en' | 'pt')}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-primary/50">Color primario</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full mt-1 h-10 rounded-lg cursor-pointer"
              />
            </div>
            <div>
              <label className="text-sm text-primary/50">Color acento</label>
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-full mt-1 h-10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <h2 className="font-semibold">Dominio y menú QR</h2>
          {settings?.domainSettings && (
            <>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-primary/50">Subdominio por defecto: </span>
                  <code className="text-xs bg-primary/5 px-1.5 py-0.5 rounded">
                    {settings.domainSettings.defaultSubdomain}
                  </code>
                </p>
                <p>
                  <span className="text-primary/50">URL del menú: </span>
                  <a
                    href={settings.domainSettings.clientUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2 break-all"
                  >
                    {settings.domainSettings.clientUrl}
                  </a>
                </p>
              </div>
              <div>
                <label className="text-sm text-primary/50">Dominio personalizado (opcional)</label>
                <input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="menu.mirestaurante.com"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
                <p className="text-xs text-primary/40 mt-2">
                  Creá un registro CNAME apuntando a{' '}
                  <code className="bg-primary/5 px-1 rounded">
                    {settings.domainSettings.dnsCnameTarget}
                  </code>
                  . Sin dominio custom, el menú se accede por subdominio o{' '}
                  <code className="bg-primary/5 px-1 rounded">?tenant=slug</code>.
                </p>
              </div>
            </>
          )}
        </section>

        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-3">
          <h2 className="font-semibold">Métodos de pago</h2>
          {(['cash', 'transfer', 'mercadopago', 'stripe'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={paymentMethods[key]}
                onChange={(e) =>
                  setPaymentMethods({ ...paymentMethods, [key]: e.target.checked })
                }
              />
              {key === 'cash' && 'Efectivo'}
              {key === 'transfer' && 'Transferencia'}
              {key === 'mercadopago' && 'MercadoPago'}
              {key === 'stripe' && 'Stripe'}
            </label>
          ))}
        </section>

        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <h2 className="font-semibold">MercadoPago</h2>
          <div>
            <label className="text-sm text-primary/50">Access Token</label>
            <input
              type="password"
              placeholder={
                settings?.integrations.mercadopagoConfigured ? '•••• configurado' : 'TEST-...'
              }
              value={mercadopagoAccessToken}
              onChange={(e) => setMercadopagoAccessToken(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
            />
          </div>
        </section>

        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <h2 className="font-semibold">AFIP — Facturación electrónica</h2>
          <p className="text-sm text-primary/50">
            Certificados, prueba de conexión y activación están en la guía dedicada.
          </p>
          <Link
            to="/connect-afip"
            className="inline-block px-4 py-2 text-sm rounded-xl bg-primary text-white hover:opacity-90"
          >
            Configurar AFIP →
          </Link>
        </section>

        <button type="submit" className="w-full py-3 bg-primary text-white font-semibold rounded-xl">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
