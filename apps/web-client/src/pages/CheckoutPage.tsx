import { useState, useEffect, useCallback } from 'react';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import type { CreateOrderInput, PaymentMethod, ShippingCalculation } from '@bistro/shared-types';

import { useCartStore } from '../stores/cart.store';

import { useOrderModeStore } from '../stores/order-mode.store';

import { useSessionStore } from '../stores/session.store';

import { useTenantStore } from '../stores/tenant.store';
import { useTenantSlug } from '../hooks/useTenantSlug';

import { formatCurrency } from '../utils/format';

import { buildMenuQuery, demoMenuPath } from '../utils/table-query';



type TipOption = 0 | 10 | 15 | 20 | 'custom';



export function CheckoutPage() {

  const { t, i18n } = useTranslation(['checkout', 'common']);

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const slug = useTenantSlug();
  const { config } = useTenantStore();

  const { tableId, tableLabel, initFromUrl } = useSessionStore();

  const { mode, initFromUrl: initModeFromUrl } = useOrderModeStore();

  const isDelivery = mode === 'delivery';

  const items = useCartStore((s) => s.items);

  const subtotal = useCartStore((s) => s.subtotal());

  const clearCart = useCartStore((s) => s.clear);

  const removeItem = useCartStore((s) => s.removeItem);

  const updateQuantity = useCartStore((s) => s.updateQuantity);



  const [tipOption, setTipOption] = useState<TipOption>(0);

  const [customTip, setCustomTip] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');



  const [customerName, setCustomerName] = useState('');

  const [customerPhone, setCustomerPhone] = useState('');

  const [customerAddress, setCustomerAddress] = useState('');

  const [shipping, setShipping] = useState<ShippingCalculation | null>(null);

  const [shippingLoading, setShippingLoading] = useState(false);

  const [shippingError, setShippingError] = useState('');



  const menuQuery = buildMenuQuery({

    tableId,

    tenantSlug: slug,

    mode: isDelivery ? 'delivery' : undefined,

  });



  useEffect(() => {

    void initFromUrl(searchParams);

    initModeFromUrl(searchParams);

  }, [searchParams, initFromUrl, initModeFromUrl]);



  const currency = config?.currency ?? 'ARS';

  const paymentMethods = config?.paymentMethods ?? { cash: true, transfer: true, mercadopago: false, stripe: false };



  const tipAmount =

    tipOption === 'custom'

      ? Math.max(0, parseFloat(customTip) || 0)

      : Math.round(subtotal * (tipOption / 100));



  const deliveryFee = isDelivery && shipping?.fee != null ? shipping.fee : 0;

  const total = subtotal + tipAmount + deliveryFee;



  const availablePayments: Array<{ id: PaymentMethod; label: string }> = [];

  if (paymentMethods.cash) availablePayments.push({ id: 'cash', label: t('payment.cash') });

  if (paymentMethods.transfer) availablePayments.push({ id: 'transfer', label: t('payment.transfer') });

  if (paymentMethods.mercadopago) availablePayments.push({ id: 'mercadopago', label: t('payment.mercadopago') });



  useEffect(() => {

    if (availablePayments.length > 0 && !availablePayments.some((p) => p.id === paymentMethod)) {

      setPaymentMethod(availablePayments[0]!.id);

    }

  }, [availablePayments.length, paymentMethods.cash, paymentMethods.transfer, paymentMethods.mercadopago, paymentMethod]);



  const calculateShipping = useCallback(async () => {

    const address = customerAddress.trim();

    if (address.length < 5) {

      setShippingError(t('delivery.addressRequired'));

      setShipping(null);

      return;

    }



    setShippingLoading(true);

    setShippingError('');



    try {

      const res = await fetch(

        `/api/v1/delivery/shipping?address=${encodeURIComponent(address)}`,

        { headers: { 'X-Tenant-ID': slug } }

      );

      const json = await res.json();

      if (!res.ok || json.error) {

        throw new Error(json.error ?? 'Error');

      }



      const data = json.data as ShippingCalculation;

      setShipping(data);

      if (!data.isDeliverable) {

        setShippingError(t('delivery.notDeliverable'));

      }

    } catch (err) {

      setShipping(null);

      setShippingError(err instanceof Error ? err.message : 'Error');

    } finally {

      setShippingLoading(false);

    }

  }, [customerAddress, slug, t]);



  const canSubmit = isDelivery

    ? customerName.trim() &&

      customerPhone.trim() &&

      customerAddress.trim() &&

      shipping?.isDeliverable &&

      shipping.fee != null

    : Boolean(tableId);



  const handleSubmit = async () => {

    if (!isDelivery && !tableId) {

      setError(t('tableRequired'));

      return;

    }

    if (isDelivery) {

      if (!customerName.trim() || !customerPhone.trim()) {

        setError(t('delivery.contactRequired'));

        return;

      }

      if (!shipping?.isDeliverable || shipping.fee == null) {

        setError(t('delivery.shippingRequired'));

        return;

      }

    }

    if (items.length === 0) {

      setError(t('cartEmpty'));

      return;

    }



    setSubmitting(true);

    setError('');



    const payload: CreateOrderInput = {

      type: isDelivery ? 'delivery' : 'dine-in',

      source: isDelivery ? 'manual' : 'qr',

      tip: tipAmount,

      deliveryFee: isDelivery ? shipping!.fee! : undefined,

      paymentMethod,

      items: items.map((item) => ({

        menuItemId: item.menuItemId,

        quantity: item.quantity,

        selectedModifiers: item.selectedModifiers.map((m) => ({

          groupId: m.groupId,

          optionId: m.optionId,

        })),

        notes: item.notes,

      })),

      ...(isDelivery

        ? {

            customer: {

              name: customerName.trim(),

              phone: customerPhone.trim(),

              address: customerAddress.trim(),

            },

          }

        : { tableId: tableId! }),

    };



    try {

      const res = await fetch(`/api/v1/orders?lang=${i18n.language}`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'X-Tenant-ID': slug,

        },

        body: JSON.stringify(payload),

      });

      const json = await res.json();



      if (!res.ok || json.error) {

        throw new Error(json.error ?? t('orderError'));

      }



      const orderId = json.data.id as string;



      if (paymentMethod === 'mercadopago') {

        const prefRes = await fetch(

          `/api/v1/payments/mercadopago/preference?orderId=${orderId}`,

          { headers: { 'X-Tenant-ID': slug } }

        );

        const prefJson = await prefRes.json();



        if (!prefRes.ok || prefJson.error) {

          throw new Error(prefJson.error ?? t('payment.mercadopagoError'));

        }



        clearCart();

        window.location.href = prefJson.data.initPoint;

        return;

      }



      clearCart();

      navigate(`/order/${orderId}`);

    } catch (err) {

      setError(err instanceof Error ? err.message : t('orderError'));

    } finally {

      setSubmitting(false);

    }

  };



  if (items.length === 0) {

    return (

      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">

        <p className="text-primary/60">{t('cartEmpty')}</p>

        <Link to={`/menu${menuQuery}`} className="text-accent font-medium hover:underline">

          {t('backToMenu')}

        </Link>

      </div>

    );

  }



  return (

    <div className="min-h-screen pb-32">

      <header className="bg-surface border-b border-primary/10 px-4 py-4">

        <div className="max-w-2xl mx-auto">

          <Link to={`/menu${menuQuery}`} className="text-sm text-primary/60 hover:text-primary">

            ← {t('backToMenu')}

          </Link>

          <h1 className="text-xl font-bold mt-2">{t('title')}</h1>

          {isDelivery ? (

            <p className="text-sm text-accent font-medium mt-1">{t('delivery.title')}</p>

          ) : (

            tableLabel && <p className="text-sm text-primary/50 mt-1">{tableLabel}</p>

          )}

        </div>

      </header>



      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {isDelivery && (

          <section className="bg-surface rounded-xl border border-primary/10 p-4 space-y-3">

            <h2 className="text-sm font-medium text-primary/50 uppercase tracking-wide">

              {t('delivery.title')}

            </h2>

            <input

              type="text"

              value={customerName}

              onChange={(e) => setCustomerName(e.target.value)}

              placeholder={t('delivery.namePlaceholder')}

              className="w-full px-4 py-2 rounded-xl border border-primary/10 focus:outline-none focus:border-accent"

              aria-label={t('delivery.name')}

            />

            <input

              type="tel"

              value={customerPhone}

              onChange={(e) => setCustomerPhone(e.target.value)}

              placeholder={t('delivery.phonePlaceholder')}

              className="w-full px-4 py-2 rounded-xl border border-primary/10 focus:outline-none focus:border-accent"

              aria-label={t('delivery.phone')}

            />

            <textarea

              value={customerAddress}

              onChange={(e) => {

                setCustomerAddress(e.target.value);

                setShipping(null);

                setShippingError('');

              }}

              placeholder={t('delivery.addressPlaceholder')}

              rows={2}

              className="w-full px-4 py-2 rounded-xl border border-primary/10 focus:outline-none focus:border-accent resize-none"

              aria-label={t('delivery.address')}

            />

            <button

              type="button"

              onClick={() => void calculateShipping()}

              disabled={shippingLoading || customerAddress.trim().length < 5}

              className="w-full py-2 text-sm font-medium rounded-xl border border-accent text-accent hover:bg-accent/10 disabled:opacity-50"

            >

              {shippingLoading ? t('common:loading') : t('delivery.calculateShipping')}

            </button>

            {shipping?.isDeliverable && shipping.fee != null && (

              <p className="text-sm text-primary/70">

                {t('delivery.estimatedTime', {

                  minutes: shipping.estimatedMinutes,

                  km: shipping.distanceKm,

                })}{' '}

                — {formatCurrency(shipping.fee, currency)}

              </p>

            )}

            {shippingError && (

              <p className="text-sm text-red-600">{shippingError}</p>

            )}

          </section>

        )}



        <section className="space-y-3">

          <h2 className="text-sm font-medium text-primary/50 uppercase tracking-wide">

            {t('yourOrder')}

          </h2>

          {items.map((item) => (

            <div

              key={item.lineId}

              className="bg-surface rounded-xl border border-primary/10 p-4"

            >

              <div className="flex justify-between items-start gap-2">

                <div>

                  <p className="font-medium">{item.name}</p>

                  {item.selectedModifiers.length > 0 && (

                    <p className="text-xs text-primary/50 mt-1">

                      {item.selectedModifiers.map((m) => m.optionName).join(', ')}

                    </p>

                  )}

                  {item.notes && (

                    <p className="text-xs text-primary/40 mt-1 italic">{item.notes}</p>

                  )}

                </div>

                <button

                  onClick={() => removeItem(item.lineId)}

                  className="text-primary/30 hover:text-red-500 text-lg"

                >

                  ×

                </button>

              </div>

              <div className="flex items-center justify-between mt-3">

                <div className="flex items-center gap-2">

                  <button

                    onClick={() => updateQuantity(item.lineId, item.quantity - 1)}

                    className="w-7 h-7 rounded-full bg-primary/5 text-sm"

                  >

                    −

                  </button>

                  <span className="text-sm w-4 text-center">{item.quantity}</span>

                  <button

                    onClick={() => updateQuantity(item.lineId, item.quantity + 1)}

                    className="w-7 h-7 rounded-full bg-primary/5 text-sm"

                  >

                    +

                  </button>

                </div>

                <span className="font-medium">

                  {formatCurrency(item.unitPrice * item.quantity, currency)}

                </span>

              </div>

            </div>

          ))}

        </section>



        <section>

          <h2 className="text-sm font-medium text-primary/50 uppercase tracking-wide mb-3">

            {t('tip')}

          </h2>

          <div className="flex gap-2 flex-wrap">

            {([0, 10, 15, 20] as const).map((pct) => (

              <button

                key={pct}

                onClick={() => setTipOption(pct)}

                className={`px-4 py-2 rounded-full text-sm font-medium transition ${

                  tipOption === pct

                    ? 'bg-accent text-primary'

                    : 'bg-primary/5 text-primary/70'

                }`}

              >

                {pct === 0 ? t('tipNone') : `${pct}%`}

              </button>

            ))}

            <button

              onClick={() => setTipOption('custom')}

              className={`px-4 py-2 rounded-full text-sm font-medium transition ${

                tipOption === 'custom'

                  ? 'bg-accent text-primary'

                  : 'bg-primary/5 text-primary/70'

              }`}

            >

              {t('tipCustom')}

            </button>

          </div>

          {tipOption === 'custom' && (

            <input

              type="number"

              min="0"

              value={customTip}

              onChange={(e) => setCustomTip(e.target.value)}

              placeholder="0"

              className="mt-3 w-full px-4 py-2 rounded-xl border border-primary/10 focus:outline-none focus:border-accent"

            />

          )}

        </section>



        <section>

          <h2 className="text-sm font-medium text-primary/50 uppercase tracking-wide mb-3">

            {t('payment.title')}

          </h2>

          <div className="space-y-2">

            {availablePayments.map((pm) => (

              <button

                key={pm.id}

                onClick={() => setPaymentMethod(pm.id)}

                className={`w-full px-4 py-3 rounded-xl border text-left text-sm font-medium transition ${

                  paymentMethod === pm.id

                    ? 'border-accent bg-accent/10'

                    : 'border-primary/10'

                }`}

              >

                {pm.label}

              </button>

            ))}

          </div>

        </section>



        <section className="bg-surface rounded-xl border border-primary/10 p-4 space-y-2">

          <div className="flex justify-between text-sm">

            <span className="text-primary/60">{t('subtotal')}</span>

            <span>{formatCurrency(subtotal, currency)}</span>

          </div>

          {deliveryFee > 0 && (

            <div className="flex justify-between text-sm">

              <span className="text-primary/60">{t('delivery.shipping')}</span>

              <span>{formatCurrency(deliveryFee, currency)}</span>

            </div>

          )}

          {tipAmount > 0 && (

            <div className="flex justify-between text-sm">

              <span className="text-primary/60">{t('tip')}</span>

              <span>{formatCurrency(tipAmount, currency)}</span>

            </div>

          )}

          <div className="flex justify-between font-bold text-lg pt-2 border-t border-primary/10">

            <span>{t('total')}</span>

            <span>{formatCurrency(total, currency)}</span>

          </div>

        </section>



        {!isDelivery && !tableId && (

          <div className="text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-xl space-y-2">

            <p>{t('tableRequired')}</p>

            <Link

              to={demoMenuPath(slug)}

              className="inline-block font-medium text-accent hover:underline"

            >

              {t('openDemoTable')}

            </Link>

          </div>

        )}



        {error && (

          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>

        )}

      </main>



      <footer className="fixed bottom-0 inset-x-0 bg-surface border-t border-primary/10 px-4 py-4">

        <div className="max-w-2xl mx-auto">

          <button

            onClick={handleSubmit}

            disabled={submitting || !canSubmit}

            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50"

          >

            {submitting ? t('common:loading') : t('placeOrder')}

          </button>

        </div>

      </footer>

    </div>

  );

}

