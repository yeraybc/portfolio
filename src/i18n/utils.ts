import { ui, type Locale, type UiKey, type L } from './ui';

export function useT(locale: Locale) {
  return (key: UiKey): string => ui[locale][key] ?? ui.en[key];
}

/** Picks the localized string from a {en, es} pair. */
export function tr(value: L, locale: Locale): string {
  return value[locale] ?? value.en;
}

/** Path for a page in a locale. `path` is locale-free, e.g. "/projects/home-credit". */
export function localePath(path: string, locale: Locale): string {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  return locale === 'en' ? clean || '/' : `/es${clean}`;
}

/** Strips the locale prefix from a pathname. */
export function stripLocale(pathname: string): string {
  const p = pathname.replace(/\.html$/, '').replace(/\/$/, '');
  if (p === '/es') return '/';
  return p.startsWith('/es/') ? p.slice(3) : p || '/';
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'es' : 'en';
}
