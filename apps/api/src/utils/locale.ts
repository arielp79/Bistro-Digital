import type { LocalizedText, SupportedLang } from '@bistro/shared-types';

export function resolveLang(lang: string | undefined, fallback = 'es'): SupportedLang {
  if (lang === 'en' || lang === 'pt' || lang === 'es') return lang;
  return fallback as SupportedLang;
}

export function localize(text: LocalizedText, lang: SupportedLang): string {
  return text[lang] || text.es;
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
