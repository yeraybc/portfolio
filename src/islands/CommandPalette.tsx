import { useEffect, useMemo, useRef, useState } from 'react';

interface Item {
  group: 'pages' | 'runs' | 'actions';
  label: string;
  hint?: string;
  run: () => void;
}

interface Props {
  data: {
    locale: 'en' | 'es';
    email: string;
    pages: { label: string; href: string }[];
    runs: { label: string; hint: string; href: string }[];
    otherLocaleHref: string;
    strings: {
      placeholder: string;
      empty: string;
      pages: string;
      runs: string;
      actions: string;
      copyEmail: string;
      copied: string;
      theme: string;
      lang: string;
      lensLabel: string;
      lenses: Record<'ds' | 'quant' | 'ai' | 'de', string>;
      email: string;
    };
  };
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function go(href: string) {
  const lens = document.documentElement.dataset.lens;
  const url = new URL(href, location.origin);
  if (lens && lens !== 'ds') url.searchParams.set('lens', lens);
  location.href = url.pathname + url.search;
}

export default function CommandPalette({ data }: Props) {
  const { strings: s } = data;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [toast, setToast] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(
    () => [
      ...data.pages.map((p) => ({ group: 'pages' as const, label: p.label, run: () => go(p.href) })),
      ...data.runs.map((r) => ({ group: 'runs' as const, label: r.label, hint: r.hint, run: () => go(r.href) })),
      {
        group: 'actions',
        label: s.copyEmail,
        hint: data.email,
        run: () => {
          navigator.clipboard?.writeText(data.email).then(
            () => setToast(s.copied),
            () => (location.href = `mailto:${data.email}`),
          );
        },
      },
      { group: 'actions', label: s.email, hint: data.email, run: () => (location.href = `mailto:${data.email}`) },
      {
        group: 'actions',
        label: s.theme,
        run: () => document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.click(),
      },
      { group: 'actions', label: s.lang, run: () => go(data.otherLocaleHref) },
      ...(Object.keys(s.lenses) as (keyof typeof s.lenses)[]).map((l) => ({
        group: 'actions' as const,
        label: `${s.lensLabel}: ${s.lenses[l]}`,
        run: () => window.dispatchEvent(new CustomEvent('setlens', { detail: l })),
      })),
    ],
    [data],
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return items;
    return items.filter((i) => norm(`${i.label} ${i.hint ?? ''}`).includes(q));
  }, [items, query]);

  useEffect(() => setActive(0), [query]);

  // Open if the visitor asked for the palette before this island hydrated.
  useEffect(() => {
    window.__cmdkReady = true;
    if (window.__cmdkPending) {
      window.__cmdkPending = false;
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !open)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    document.querySelectorAll('[data-cmdk-open]').forEach((b) => b.addEventListener('click', onOpen));
    return () => {
      window.removeEventListener('keydown', onKey);
      document.querySelectorAll('[data-cmdk-open]').forEach((b) => b.removeEventListener('click', onOpen));
    };
  }, [open]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQuery('');
      inputRef.current?.focus();
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  const choose = (i: Item) => {
    i.run();
    if (i.group !== 'actions' || !i.label.startsWith(s.copyEmail)) setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && filtered[active]) {
      e.preventDefault();
      choose(filtered[active]);
    }
  };

  const groups: Item['group'][] = ['pages', 'runs', 'actions'];
  let index = -1;

  return (
    <>
      <dialog
        ref={dialogRef}
        className="cmdk"
        aria-label={s.placeholder}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && setOpen(false)}
      >
        <div className="cmdk-box">
          <input
            ref={inputRef}
            className="cmdk-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={filtered[active] ? `cmdk-${active}` : undefined}
            placeholder={s.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div id="cmdk-list" role="listbox" className="cmdk-list">
            {filtered.length === 0 && <p className="cmdk-empty">{s.empty}</p>}
            {groups.map((g) => {
              const inGroup = filtered.filter((i) => i.group === g);
              if (!inGroup.length) return null;
              return (
                <div key={g} role="group" aria-label={s[g]}>
                  <p className="cmdk-group">{s[g]}</p>
                  {inGroup.map((item) => {
                    index++;
                    const i = index;
                    return (
                      <div
                        key={`${g}-${item.label}`}
                        id={`cmdk-${i}`}
                        role="option"
                        aria-selected={i === active}
                        className="cmdk-item"
                        onMouseMove={() => setActive(i)}
                        onClick={() => choose(item)}
                      >
                        <span>{item.label}</span>
                        {item.hint && <span className="cmdk-hint">{item.hint}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </dialog>
      <div className="cmdk-toast" role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
