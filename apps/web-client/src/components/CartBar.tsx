import { Link } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { useCartStore } from '../stores/cart.store';

import { useOrderModeStore } from '../stores/order-mode.store';

import { useSessionStore } from '../stores/session.store';

import { useTenantSlug } from '../hooks/useTenantSlug';

import { formatCurrency } from '../utils/format';

import { buildCheckoutQuery } from '../utils/table-query';



interface CartBarProps {

  currency: string;

}



export function CartBar({ currency }: CartBarProps) {

  const { t } = useTranslation('checkout');

  const slug = useTenantSlug();

  const { tableId } = useSessionStore();

  const { mode } = useOrderModeStore();

  const items = useCartStore((s) => s.items);

  const itemCount = useCartStore((s) => s.itemCount());

  const subtotal = useCartStore((s) => s.subtotal());



  if (items.length === 0) return null;



  const checkoutPath = `/checkout${buildCheckoutQuery({

    tableId,

    tenantSlug: slug,

    mode: mode === 'delivery' ? 'delivery' : undefined,

  })}`;



  return (

    <div className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-primary/10 px-4 py-3 shadow-lg">

      <div className="max-w-2xl mx-auto">

        <Link

          to={checkoutPath}

          className="flex items-center justify-between w-full px-5 py-3 bg-primary text-white rounded-xl hover:opacity-90 transition"

        >

          <span className="font-medium">

            {t('viewCart')} ({itemCount})

          </span>

          <span className="font-semibold">{formatCurrency(subtotal, currency)}</span>

        </Link>

      </div>

    </div>

  );

}

