import type { Locale } from '../i18n/ui';

const tag = (locale: Locale) => (locale === 'es' ? 'es-ES' : 'en-GB');

export function fmtNum(v: number, locale: Locale, decimals?: number): string {
  const d = decimals ?? (Number.isInteger(v) ? 0 : 2);
  // es-ES skips the thousands separator for 4-digit numbers by default; force it for tables.
  return new Intl.NumberFormat(tag(locale), { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' })
    .format(v)
    .replace('-', '−');
}

export function fmtPct(v: number, locale: Locale, decimals = 1): string {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  const body = new Intl.NumberFormat(tag(locale), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Math.abs(v));
  return locale === 'es' ? `${sign}${body} %` : `${sign}${body}%`;
}

export function withUnit(v: string, unit?: string): string {
  if (!unit) return v;
  return unit === '%' ? `${v}%` : `${v} ${unit}`;
}

/** Baseline value as displayed, with "~" when it is an estimate. */
export function fmtBaseline(m: { baseline: number; decimals?: number; approx_baseline?: boolean }, locale: Locale): string {
  return `${m.approx_baseline ? '~' : ''}${fmtNum(m.baseline, locale, m.decimals)}`;
}
