import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenantStore } from '../stores/tenant.store';
import { isValidSlugFormat, normalizeSlug } from '../utils/tenant-resolve';

export function TenantSelectPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resolveSlug = useTenantStore((s) => s.resolveSlug);

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const slug = normalizeSlug(input);
    if (!isValidSlugFormat(slug)) {
      setError(t('tenant.invalidFormat'));
      return;
    }

    setLoading(true);
    const ok = await resolveSlug(slug);
    setLoading(false);

    if (!ok) {
      setError(t('tenant.notFound'));
      return;
    }

    const redirect = searchParams.get('redirect');
    navigate(redirect && redirect.startsWith('/') ? redirect : '/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-primary/10 px-6 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-semibold text-center">{t('tenant.appName')}</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-accent/30 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
            <h2 className="text-2xl font-bold">{t('tenant.title')}</h2>
            <p className="text-primary/60">{t('tenant.subtitle')}</p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label htmlFor="tenant-slug" className="block text-sm font-medium mb-1.5">
                {t('tenant.slugLabel')}
              </label>
              <input
                id="tenant-slug"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('tenant.slugPlaceholder')}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-xl border border-primary/15 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50"
                disabled={loading}
              />
              <p className="mt-1.5 text-xs text-primary/50">{t('tenant.slugHint')}</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full px-6 py-3 bg-accent text-primary font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? t('tenant.loading') : t('tenant.continue')}
            </button>
          </form>

          <p className="text-center text-sm text-primary/50">
            {t('tenant.scanQrHint')}
          </p>
        </div>
      </main>
    </div>
  );
}
