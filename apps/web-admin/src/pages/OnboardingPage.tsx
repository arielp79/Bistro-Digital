import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  OnboardingPlanOption,
  OnboardingRegisterResponse,
  SlugAvailability,
  TenantPlan,
} from '@bistro/shared-types';
import { CopyField } from '../components/CopyField';
import { publicFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

const STEPS = ['Restaurante', 'Marca', 'Plan', 'Administrador', 'Contenido inicial', 'Listo'] as const;
const DONE_STEP = STEPS.length - 1;

function slugifyClient(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugAvailability | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);

  const [primaryColor, setPrimaryColor] = useState('#1A1A2E');
  const [accentColor, setAccentColor] = useState('#E8C468');
  const [defaultLanguage, setDefaultLanguage] = useState<'es' | 'en' | 'pt'>('es');
  const [currency, setCurrency] = useState<'ARS' | 'USD' | 'BRL'>('ARS');

  const [plans, setPlans] = useState<OnboardingPlanOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan>('starter');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [includeStarterMenu, setIncludeStarterMenu] = useState(true);
  const [tableCount, setTableCount] = useState(4);

  const [result, setResult] = useState<OnboardingRegisterResponse | null>(null);

  useEffect(() => {
    publicFetch<OnboardingPlanOption[]>('/api/v1/onboarding/plans')
      .then(setPlans)
      .catch(() => {
        /* fallback mínimo si la API no responde */
        setPlans([
          {
            id: 'starter',
            name: 'Starter',
            description: 'Menú QR y panel básico',
            priceLabel: 'Gratis',
            features: ['Menú QR', 'Panel admin'],
            recommended: true,
          },
        ]);
      });
  }, []);

  const checkSlug = useCallback(async (value: string) => {
    if (value.length < 3) {
      setSlugStatus({ available: false, slug: value, reason: 'Mínimo 3 caracteres' });
      return;
    }
    setSlugChecking(true);
    try {
      const data = await publicFetch<SlugAvailability>(
        `/api/v1/onboarding/check-slug?slug=${encodeURIComponent(value)}`
      );
      setSlugStatus(data);
    } catch {
      setSlugStatus(null);
    } finally {
      setSlugChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!restaurantName.trim() || slugTouched) return;
    const timer = setTimeout(async () => {
      try {
        const data = await publicFetch<{ suggested: string; available: boolean }>(
          `/api/v1/onboarding/suggest-slug?name=${encodeURIComponent(restaurantName)}`
        );
        setSlug(data.suggested);
        void checkSlug(data.suggested);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [restaurantName, slugTouched, checkSlug]);

  useEffect(() => {
    if (slug.length < 3) return;
    const timer = setTimeout(() => void checkSlug(slug), 350);
    return () => clearTimeout(timer);
  }, [slug, checkSlug]);

  const canNext = (): boolean => {
    if (step === 0) return restaurantName.trim().length >= 2 && slugStatus?.available === true;
    if (step === 1) return true;
    if (step === 2) return Boolean(selectedPlan);
    if (step === 3) return adminName.length >= 2 && adminEmail.includes('@') && adminPassword.length >= 6;
    if (step === 4) return tableCount >= 1;
    return true;
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await publicFetch<OnboardingRegisterResponse>('/api/v1/onboarding/register', {
        method: 'POST',
        body: JSON.stringify({
          restaurantName,
          slug,
          primaryColor,
          accentColor,
          defaultLanguage,
          currency,
          plan: selectedPlan,
          adminName,
          adminEmail,
          adminPassword,
          includeStarterMenu,
          tableCount,
        }),
      });
      completeOnboarding(data);
      setResult(data);
      setStep(DONE_STEP);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el restaurante');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanInfo = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6 py-10">
        <div className="text-center mb-8">
          <span className="text-4xl">🍽️</span>
          <h1 className="text-2xl font-bold mt-2">Alta de restaurante</h1>
          <p className="text-sm text-primary/50 mt-1">
            Creá tu espacio en Bistró Digital en pocos minutos
          </p>
        </div>

        <div className="flex justify-between mb-8 gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 text-center">
              <div
                className={`h-1 rounded-full mb-2 ${i <= step ? 'bg-accent' : 'bg-primary/10'}`}
              />
              <span className={`text-[10px] sm:text-xs ${i === step ? 'font-medium' : 'text-primary/40'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

        <div className="bg-surface rounded-2xl border border-primary/10 p-6 sm:p-8 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">¿Cómo se llama tu restaurante?</h2>
              <p className="text-sm text-primary/50">
                Este nombre aparece en el menú digital, pedidos y panel de administración.
              </p>
              <div>
                <label className="text-sm text-primary/50">Nombre del restaurante</label>
                <input
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Ej: Parrilla del Puerto"
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-primary/50">Identificador único (URL)</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-primary/40 shrink-0">tu-saas.com/</span>
                  <input
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugifyClient(e.target.value));
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm font-mono"
                  />
                </div>
                {slugChecking && <p className="text-xs text-primary/40 mt-1">Verificando...</p>}
                {slugStatus && !slugChecking && (
                  <p
                    className={`text-xs mt-1 ${
                      slugStatus.available ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {slugStatus.available
                      ? `✓ "${slugStatus.slug}" disponible`
                      : `✗ ${slugStatus.reason ?? 'No disponible'}`}
                  </p>
                )}
                <p className="text-xs text-primary/40 mt-1">
                  Header API: <code>X-Tenant-ID: {slug || '...'}</code>
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Personalizá tu marca</h2>
              <p className="text-sm text-primary/50">
                Colores e idioma del menú QR. Podés cambiarlos después en Configuración.
              </p>
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
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="text-sm text-primary/50">Moneda</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'ARS' | 'USD' | 'BRL')}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                  >
                    <option value="ARS">ARS — Peso argentino</option>
                    <option value="USD">USD — Dólar</option>
                    <option value="BRL">BRL — Real</option>
                  </select>
                </div>
              </div>
              <div
                className="rounded-xl p-4 text-white text-sm"
                style={{ backgroundColor: primaryColor, borderBottom: `4px solid ${accentColor}` }}
              >
                Vista previa — {restaurantName || 'Tu restaurante'}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Elegí tu plan</h2>
              <p className="text-sm text-primary/50">
                Podés empezar gratis y cambiar de plan después desde el operador SaaS.
              </p>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      selectedPlan === plan.id
                        ? 'border-accent bg-accent/10 ring-2 ring-accent/40'
                        : 'border-primary/10 hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          {plan.name}
                          {plan.recommended && (
                            <span className="text-[10px] uppercase tracking-wide bg-accent text-primary px-2 py-0.5 rounded-full font-bold">
                              Recomendado
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-primary/50 mt-1">{plan.description}</p>
                      </div>
                      <span className="text-sm font-medium shrink-0">{plan.priceLabel}</span>
                    </div>
                    <ul className="mt-3 text-xs text-primary/60 list-disc list-inside space-y-0.5">
                      {plan.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Cuenta de administrador</h2>
              <p className="text-sm text-primary/50">
                Con este usuario accedés al panel. Te enviaremos un email de bienvenida con los enlaces.
              </p>
              <div>
                <label className="text-sm text-primary/50">Tu nombre</label>
                <input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-primary/50">Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-primary/50">Contraseña</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  minLength={6}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Contenido inicial</h2>
              <p className="text-sm text-primary/50">
                Te dejamos un menú de ejemplo y mesas con QR para empezar a probar de inmediato.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeStarterMenu}
                  onChange={(e) => setIncludeStarterMenu(e.target.checked)}
                />
                Incluir menú de ejemplo (6 ítems en 3 categorías)
              </label>
              <div>
                <label className="text-sm text-primary/50">Cantidad de mesas con QR</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableCount}
                  onChange={(e) => setTableCount(Number(e.target.value) || 1)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-primary/10 text-sm"
                />
              </div>
              <ul className="text-sm text-primary/60 list-disc list-inside space-y-1">
                <li>
                  Plan seleccionado: <strong>{selectedPlanInfo?.name ?? selectedPlan}</strong>
                </li>
                <li>Podés editar el menú y las mesas desde el panel</li>
                <li>WhatsApp / Instagram: configurá después en Conectar Meta</li>
              </ul>
            </div>
          )}

          {step === DONE_STEP && result && (
            <div className="space-y-5 text-center">
              <span className="text-5xl">🎉</span>
              <h2 className="font-semibold text-xl">¡{result.tenant.name} está listo!</h2>
              <p className="text-sm text-primary/60">
                Identificador: <strong className="font-mono">{result.tenant.slug}</strong>
                {' · '}
                Plan: <strong>{result.tenant.plan}</strong>
              </p>
              {result.welcomeEmail.sent ? (
                <p className="text-sm text-green-700">
                  Email de bienvenida enviado a {result.user.email}
                </p>
              ) : (
                <p className="text-xs text-primary/40">
                  Email de bienvenida no enviado ({result.welcomeEmail.mode})
                </p>
              )}
              <CopyField label="Menú QR (mesa 1)" value={result.urls.clientMenu} />
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl"
                >
                  Ir al panel
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/pilot-setup')}
                  className="flex-1 py-3 border border-primary/10 font-semibold rounded-xl hover:bg-primary/5"
                >
                  Conectar Meta
                </button>
              </div>
            </div>
          )}

          {step < DONE_STEP && (
            <div className="flex gap-3 mt-8 pt-6 border-t border-primary/10">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="px-5 py-2.5 rounded-xl border border-primary/10 text-sm"
                >
                  Atrás
                </button>
              )}
              <div className="flex-1" />
              {step < 4 ? (
                <button
                  type="button"
                  disabled={!canNext()}
                  onClick={() => setStep((s) => s + 1)}
                  className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl disabled:opacity-50"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading || !canNext()}
                  onClick={() => void submit()}
                  className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear restaurante'}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-primary/50 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-primary underline underline-offset-2">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
