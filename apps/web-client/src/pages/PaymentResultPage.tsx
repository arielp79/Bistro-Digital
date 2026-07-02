import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type PaymentResult = 'success' | 'failure' | 'pending';

interface PaymentResultPageProps {
  result: PaymentResult;
}

export function PaymentResultPage({ result }: PaymentResultPageProps) {
  const { t } = useTranslation(['payment', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (orderId && result === 'success') {
      const timer = setTimeout(() => navigate(`/order/${orderId}`), 3000);
      return () => clearTimeout(timer);
    }
  }, [orderId, result, navigate]);

  const titleKey = `result.${result}.title`;
  const messageKey = `result.${result}.message`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4 ${
          result === 'success'
            ? 'bg-green-100 text-green-600'
            : result === 'pending'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-red-100 text-red-600'
        }`}
      >
        {result === 'success' ? '✓' : result === 'pending' ? '⏳' : '✕'}
      </div>
      <h1 className="text-2xl font-bold mb-2">{t(titleKey)}</h1>
      <p className="text-primary/60 max-w-md mb-6">{t(messageKey)}</p>

      {orderId && (
        <Link
          to={`/order/${orderId}`}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition"
        >
          {t('viewOrder')}
        </Link>
      )}

      {result === 'success' && orderId && (
        <p className="text-xs text-primary/40 mt-4">{t('redirecting')}</p>
      )}
    </div>
  );
}
