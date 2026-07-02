import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AfipTestResult, TenantAdminSettings } from '@bistro/shared-types';
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

export function ConnectAfipPage() {
  const [settings, setSettings] = useState<TenantAdminSettings | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [afipEnabled, setAfipEnabled] = useState(false);
  const [afipCuit, setAfipCuit] = useState('');
  const [afipPointOfSale, setAfipPointOfSale] = useState(1);
  const [afipCertificate, setAfipCertificate] = useState('');
  const [afipPrivateKey, setAfipPrivateKey] = useState('');

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<AfipTestResult | null>(null);

  const loadSettings = () => {
    apiFetch<TenantAdminSettings>('/api/v1/tenant/settings')
      .then((s) => {
        setSettings(s);
        setAfipEnabled(s.afip.enabled);
        setAfipCuit(s.afip.cuit);
        setAfipPointOfSale(s.afip.pointOfSale);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const progress = useMemo(() => {
    if (!settings) return 0;
    const steps = [
      Boolean(settings.afip.cuit),
      settings.afip.certificateConfigured,
      settings.afip.privateKeyConfigured,
      Boolean(testResult?.ok),
      settings.afip.enabled,
    ];
    return Math.round((steps.filter(Boolean).length / steps.length) * 100);
  }, [settings, testResult]);

  const canTest =
    settings?.afip.certificateConfigured &&
    settings?.afip.privateKeyConfigured &&
    Boolean(settings?.afip.cuit);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await apiFetch<TenantAdminSettings>('/api/v1/tenant/config', {
        method: 'PATCH',
        body: JSON.stringify({
          afip: {
            enabled: afipEnabled,
            cuit: afipCuit,
            pointOfSale: afipPointOfSale,
            ...(afipCertificate.trim() ? { certificate: afipCertificate } : {}),
            ...(afipPrivateKey.trim() ? { privateKey: afipPrivateKey } : {}),
          },
        }),
      });
      setSettings(updated);
      setAfipCertificate('');
      setAfipPrivateKey('');
      setTestResult(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const runAfipTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    setError('');
    try {
      const result = await apiFetch<AfipTestResult>('/api/v1/billing/afip/test', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al probar AFIP');
    } finally {
      setTestLoading(false);
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
        <h1 className="text-2xl font-bold">Conectar AFIP</h1>
        <p className="text-sm text-primary/60 mt-2 max-w-2xl">
          Guía para homologación y producción. Sin AFIP habilitado, las facturas son comprobantes{' '}
          <strong>demo</strong> (sin validez fiscal). Con certificados reales, en desarrollo se usa
          homologación; en producción se emite CAE fiscal.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-primary/60">Progreso AFIP</span>
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
      {saved && <p className="text-green-600 text-sm mb-4">Configuración AFIP guardada</p>}

      <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <div className="flex gap-3">
            <StepBadge done={Boolean(settings?.afip.cuit)} n={1} />
            <div className="space-y-2 flex-1">
              <h2 className="font-semibold">Alta en AFIP</h2>
              <ol className="text-sm text-primary/60 list-decimal list-inside space-y-1">
                <li>
                  Ingresá a{' '}
                  <a
                    href="https://www.afip.gob.ar/ws/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    AFIP Web Services
                  </a>{' '}
                  con el CUIT del restaurante
                </li>
                <li>Administrador de Relaciones → habilitar «Web Services de Facturación Electrónica»</li>
                <li>Crear punto de venta para facturación electrónica (anotá el número)</li>
                <li>Generar certificado de homologación (y luego producción cuando corresponda)</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <div className="flex gap-3">
            <StepBadge
              done={Boolean(settings?.afip.certificateConfigured && settings?.afip.privateKeyConfigured)}
              n={2}
            />
            <div className="space-y-4 flex-1">
              <h2 className="font-semibold">Credenciales</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-primary/50">CUIT</label>
                  <input
                    value={afipCuit}
                    onChange={(e) => setAfipCuit(e.target.value)}
                    placeholder="30-12345678-9"
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-primary/50">Punto de venta</label>
                  <input
                    type="number"
                    min={1}
                    value={afipPointOfSale}
                    onChange={(e) => setAfipPointOfSale(Number(e.target.value) || 1)}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-primary/50">Certificado (.crt PEM)</label>
                <textarea
                  rows={4}
                  placeholder={
                    settings?.afip.certificateConfigured
                      ? '•••• configurado — pegá uno nuevo para reemplazar'
                      : '-----BEGIN CERTIFICATE-----'
                  }
                  value={afipCertificate}
                  onChange={(e) => setAfipCertificate(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-sm text-primary/50">Clave privada (.key PEM)</label>
                <textarea
                  rows={4}
                  placeholder={
                    settings?.afip.privateKeyConfigured
                      ? '•••• configurado — pegá una nueva para reemplazar'
                      : '-----BEGIN PRIVATE KEY-----'
                  }
                  value={afipPrivateKey}
                  onChange={(e) => setAfipPrivateKey(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <div className="flex gap-3">
            <StepBadge done={Boolean(testResult?.ok)} n={3} />
            <div className="space-y-3 flex-1">
              <h2 className="font-semibold">Probar conexión</h2>
              <p className="text-sm text-primary/60">
                Guardá los certificados y ejecutá la prueba. En desarrollo se conecta a{' '}
                <strong>homologación</strong> aunque AFIP esté habilitado.
              </p>
              <button
                type="button"
                disabled={testLoading || !canTest}
                onClick={() => void runAfipTest()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-50"
              >
                {testLoading ? 'Probando...' : 'Probar conexión AFIP'}
              </button>
              {!canTest && (
                <p className="text-xs text-primary/40">Guardá CUIT + certificado + clave antes de probar.</p>
              )}
              {testResult && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-900">
                  <p className="font-medium">{testResult.message}</p>
                  <p className="mt-1 text-green-800">
                    Entorno: {testResult.environment} · PV {testResult.pointOfSale} · último comprobante B:{' '}
                    {testResult.lastVoucherB}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-xl border border-primary/10 p-6 space-y-4">
          <div className="flex gap-3">
            <StepBadge done={Boolean(settings?.afip.enabled)} n={4} />
            <div className="space-y-3 flex-1">
              <h2 className="font-semibold">Activar integración</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={afipEnabled}
                  onChange={(e) => setAfipEnabled(e.target.checked)}
                />
                Habilitar AFIP real (emitir CAE vía WS — homologación o producción según entorno)
              </label>
              <p className="text-xs text-primary/50">
                Emití una factura B de prueba en{' '}
                <Link to="/billing" className="underline">
                  Facturación
                </Link>{' '}
                tras una conexión exitosa.
              </p>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-primary text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar configuración AFIP'}
        </button>
      </form>
    </div>
  );
}
