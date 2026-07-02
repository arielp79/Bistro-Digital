import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MenuItemPublic } from '@bistro/shared-types';
import { CartBar } from '../components/CartBar';
import { MenuItemCard } from '../components/MenuItemCard';
import { ModifierModal } from '../components/ModifierModal';
import { useCartStore } from '../stores/cart.store';
import { useMenuStore } from '../stores/menu.store';
import { useOrderModeStore } from '../stores/order-mode.store';
import { useSessionStore } from '../stores/session.store';
import { useTenantStore } from '../stores/tenant.store';

export function MenuPage() {
  const { t, i18n } = useTranslation(['menu', 'common']);
  const [searchParams] = useSearchParams();
  const { config, loading: tenantLoading, error: tenantError, loadConfig, setSlug } = useTenantStore();
  const { menu, loading: menuLoading, error: menuError, loadMenu } = useMenuStore();
  const { tableId, tableLabel, initFromUrl } = useSessionStore();
  const { mode, initFromUrl: initModeFromUrl } = useOrderModeStore();
  const isDelivery = mode === 'delivery';
  const addItem = useCartStore((s) => s.addItem);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modifierItem, setModifierItem] = useState<MenuItemPublic | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const tenant = searchParams.get('tenant');
    if (tenant) setSlug(tenant);
    loadConfig();
  }, [loadConfig, searchParams, setSlug]);

  useEffect(() => {
    initFromUrl(searchParams);
    initModeFromUrl(searchParams);
  }, [searchParams, initFromUrl, initModeFromUrl]);

  useEffect(() => {
    if (config) {
      loadMenu(i18n.language);
    }
  }, [config, i18n.language, loadMenu]);

  useEffect(() => {
    if (menu?.categories.length && !activeCategory) {
      setActiveCategory(menu.categories[0].id);
    }
  }, [menu, activeCategory]);

  const loading = tenantLoading || menuLoading;
  const error = tenantError || menuError;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAdd = (item: MenuItemPublic) => {
    if (item.modifierGroups.length > 0) {
      setModifierItem(item);
      return;
    }
    const result = addItem(item, [], 1);
    if (result.success) showToast(t('menu:addedToCart'));
  };

  const handleModifierConfirm = (
    modifiers: Parameters<typeof addItem>[1],
    quantity: number,
    notes: string
  ) => {
    if (!modifierItem) return;
    const result = addItem(modifierItem, modifiers, quantity, notes);
    if (result.success) {
      showToast(t('menu:addedToCart'));
      setModifierItem(null);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    loadMenu(lang);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-primary/60">{t('common:loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            loadConfig();
            loadMenu(i18n.language);
          }}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
        >
          {t('common:retry')}
        </button>
      </div>
    );
  }

  const currency = menu?.currency ?? config?.currency ?? 'ARS';
  const categories = menu?.categories ?? [];
  const selectedCategory = categories.find((c) => c.id === activeCategory) ?? categories[0];

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-primary/10 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-lg font-semibold">{config?.name ?? 'Bistró Digital'}</h1>
              {isDelivery ? (
                <p className="text-xs text-accent font-medium">{t('menu:deliveryMode')}</p>
              ) : tableLabel ? (
                <p className="text-xs text-primary/50">{tableLabel}</p>
              ) : !tableId ? (
                <p className="text-xs text-amber-600">{t('menu:noTable')}</p>
              ) : null}
            </div>
            <div className="flex gap-1">
              {(config?.languages ?? ['es']).map((lang) => (
                <button
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  className={`text-xs px-2 py-1 rounded-md uppercase font-medium transition ${
                    i18n.language === lang
                      ? 'bg-primary text-white'
                      : 'bg-primary/5 text-primary/60 hover:bg-primary/10'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                    activeCategory === cat.id
                      ? 'bg-accent text-primary'
                      : 'bg-primary/5 text-primary/70 hover:bg-primary/10'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {categories.length === 0 ? (
          <div className="text-center py-16 text-primary/50">
            <p className="text-lg">{t('menu:empty')}</p>
          </div>
        ) : (
          selectedCategory && (
            <section>
              <h2 className="text-xl font-bold mb-4">{selectedCategory.name}</h2>
              <div className="space-y-3">
                {selectedCategory.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    currency={currency}
                    onAdd={handleAdd}
                    addLabel={
                      item.modifierGroups.length > 0 ? t('menu:customize') : t('menu:addToCart')
                    }
                  />
                ))}
              </div>
            </section>
          )
        )}
      </main>

      <div className="fixed bottom-16 inset-x-0 flex justify-center pointer-events-none z-30">
        {toast && (
          <span className="bg-primary text-white text-sm px-4 py-2 rounded-full shadow-lg">
            {toast}
          </span>
        )}
      </div>

      <CartBar currency={currency} />

      <footer className="fixed bottom-0 inset-x-0 bg-surface border-t border-primary/10 px-4 py-3 z-10 pointer-events-none opacity-0">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="text-sm text-primary/60">
            ← {t('common:back')}
          </Link>
        </div>
      </footer>

      {modifierItem && (
        <ModifierModal
          item={modifierItem}
          currency={currency}
          onClose={() => setModifierItem(null)}
          onConfirm={handleModifierConfirm}
          labels={{
            title: modifierItem.name,
            required: t('menu:modifier.required'),
            optional: t('menu:modifier.optional'),
            notes: t('menu:modifier.notes'),
            notesPlaceholder: t('menu:modifier.notesPlaceholder'),
            quantity: t('menu:modifier.quantity'),
            add: t('menu:addToCart'),
            cancel: t('menu:modifier.cancel'),
            selectOption: t('menu:modifier.selectOption'),
          }}
        />
      )}
    </div>
  );
}
