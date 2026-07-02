export function formatCurrency(amount: number, currency: string): string {
  const locale = currency === 'USD' ? 'en-US' : currency === 'BRL' ? 'pt-BR' : 'es-AR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
