import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTenantStore } from '../stores/tenant.store';
import { demoMenuPath, deliveryMenuPath } from '../utils/table-query';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { slug, config, loading, error } = useTenantStore();

  useEffect(() => {
    if (config?.defaultLanguage) {
      i18n.changeLanguage(config.defaultLanguage);
    }
  }, [config, i18n]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-primary/60">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-600">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => useTenantStore.getState().loadConfig()}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
          >
            {t('retry')}
          </button>
          <button
            onClick={() => {
              useTenantStore.getState().clearSlug();
              window.location.href = '/';
            }}
            className="px-6 py-2 border border-primary/20 rounded-lg hover:bg-primary/5 transition"
          >
            {t('tenant.changeRestaurant')}
          </button>
        </div>
      </div>
    );
  }

  if (!slug) return null;

  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-primary/10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{config?.name ?? slug}</h1>
          <button
            type="button"
            onClick={() => {
              useTenantStore.getState().clearSlug();
              window.location.href = '/';
            }}
            className="text-xs px-2 py-1 text-primary/60 hover:text-primary border border-primary/15 rounded-full transition shrink-0"
          >
            {t('tenant.changeRestaurant')}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-accent/30 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">🍽️</span>
          </div>

          <h2 className="text-3xl font-bold">
            {t('welcome', { name: config?.name ?? 'Bistró Digital' })}
          </h2>

          <p className="text-primary/60 text-lg">{t('scanQr')}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <Link
              to={demoMenuPath(slug)}
              className="inline-block px-8 py-3 bg-accent text-primary font-semibold rounded-xl hover:opacity-90 transition shadow-sm"
            >
              {t('viewMenu')}
            </Link>
            <Link
              to={deliveryMenuPath(slug)}
              className="inline-block px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition shadow-sm"
            >
              {t('orderDelivery')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
