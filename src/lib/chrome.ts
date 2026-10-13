// Client behaviour shared by every page: theme, mobile menu, focus lens and the ⌘K hint.
import { DEFAULT_LENS, parseLens, type Lens } from './lens';

const root = document.documentElement;

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setTheme(theme: 'dark' | 'light') {
  root.dataset.theme = theme;
  store('theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f6f8fb' : '#0f1624');
}

export function toggleTheme() {
  setTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
}

function withLens(href: string, lens: Lens): string {
  const url = new URL(href, location.origin);
  if (url.origin !== location.origin) return href;
  if (lens === DEFAULT_LENS) url.searchParams.delete('lens');
  else url.searchParams.set('lens', lens);
  return url.pathname + url.search + url.hash;
}

export function applyLens(lens: Lens, opts: { persist?: boolean } = {}) {
  root.dataset.lens = lens;
  if (opts.persist) {
    store('lens', lens);
    history.replaceState(history.state, '', withLens(location.href, lens));
  }
  document.querySelectorAll<HTMLSelectElement>('[data-lens-select]').forEach((s) => (s.value = lens));

  // Reorder lists that declare a rank per lens.
  document.querySelectorAll<HTMLElement>('[data-lens-sort]').forEach((list) => {
    const items = Array.from(list.children) as HTMLElement[];
    items
      .map((el, i) => ({ el, i, rank: Number(el.dataset[`rank${lens[0].toUpperCase()}${lens.slice(1)}`] ?? 1e9) }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .forEach(({ el }) => list.appendChild(el));
  });

  // Highlight the tools that matter for this focus.
  const stack: Record<Lens, string[]> = JSON.parse(document.getElementById('lens-stack')?.textContent ?? '{}');
  const wanted = new Set(stack[lens] ?? []);
  document.querySelectorAll<HTMLElement>('[data-tool]').forEach((el) => el.classList.toggle('hl', wanted.has(el.dataset.tool!)));

  // Keep the focus when navigating.
  document.querySelectorAll<HTMLAnchorElement>('a[data-internal], a[data-lang-link]').forEach((a) => {
    a.setAttribute('href', withLens(a.getAttribute('href')!, lens));
  });

  window.dispatchEvent(new CustomEvent('lenschange', { detail: lens }));
}

declare global {
  interface Window {
    __cmdkReady?: boolean;
    __cmdkPending?: boolean;
  }
}

/** Remembers a ⌘K request made before the palette island hydrates; the island opens on mount. */
function captureEarlyPalette() {
  const request = () => {
    if (window.__cmdkReady) return;
    window.__cmdkPending = true;
    window.dispatchEvent(new Event('cmdk-request'));
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !window.__cmdkReady) {
      e.preventDefault();
      request();
    }
  });
  document.querySelectorAll('[data-cmdk-open]').forEach((b) => b.addEventListener('click', request));
}

export function initChrome() {
  root.classList.add('js');
  captureEarlyPalette();

  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', toggleTheme));

  const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const drawer = document.getElementById('site-nav');
  menuBtn?.addEventListener('click', () => {
    const open = !drawer?.classList.contains('open');
    drawer?.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  document.querySelectorAll('[data-cmdk-hint]').forEach((k) => (k.textContent = isMac ? '⌘K' : 'Ctrl K'));

  const fromUrl = parseLens(new URLSearchParams(location.search).get('lens'));
  const lens = fromUrl ?? parseLens(read('lens')) ?? DEFAULT_LENS;
  if (fromUrl) store('lens', fromUrl);
  applyLens(lens);

  document.querySelectorAll<HTMLSelectElement>('[data-lens-select]').forEach((s) =>
    s.addEventListener('change', () => applyLens(parseLens(s.value) ?? DEFAULT_LENS, { persist: true })),
  );
  window.addEventListener('setlens', (e) => applyLens((e as CustomEvent<Lens>).detail, { persist: true }));
}
