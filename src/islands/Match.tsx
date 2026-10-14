import { useEffect, useMemo, useState } from 'react';
import { roles, sectors, skills } from '../data/match-profile';
import { examples } from '../data/match-examples';
import { MATCH_PASTE_ENABLED, BAND_THRESHOLDS } from '../lib/match-config';
import { emptyQuery, extract, fromParams, getSkill, score, toParams, type MatchResult, type Priority, type Query, type Seniority, type Status } from '../lib/match';
import { localePath } from '../i18n/utils';
import type { Lens } from '../lib/lens';

type Locale = 'en' | 'es';

interface Props {
  locale: Locale;
  email: string;
  /** Every "match.*" string, keyed without the prefix. */
  s: Record<string, string>;
  lenses: Record<Lens, string>;
}

const fill = (str: string, vars: Record<string, string | number>) => str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
const GLYPH: Record<Status, string> = { have: '●', learning: '◐', adjacent: '◇', gap: '○' };
const LEVELS: Seniority[] = ['intern', 'junior', 'mid', 'senior'];

function fmt(v: number, locale: Locale, d = 2, signed = false) {
  const n = new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(v));
  const sign = v < 0 ? '−' : signed && v > 0 ? '+' : '';
  return `${sign}${n}`;
}

// ---------------------------------------------------------------- input

function OfferPaste({ text, setText, onRead, s }: { text: string; setText: (t: string) => void; onRead: () => void; s: Props['s'] }) {
  return (
    <div className="mt-paste">
      <label htmlFor="mt-offer">{s['paste.label']}</label>
      <textarea id="mt-offer" value={text} rows={8} placeholder={s['paste.placeholder']} onChange={(e) => setText(e.target.value)} />
      <div className="mt-row">
        <button type="button" className="btn btn-primary" onClick={onRead} disabled={!text.trim()}>
          {s['paste.read']}
        </button>
        <p className="muted small">{s['paste.privacy']}</p>
      </div>
    </div>
  );
}

function Picker({ q, setQ, locale, s }: { q: Query; setQ: (q: Query) => void; locale: Locale; s: Props['s'] }) {
  const [draft, setDraft] = useState('');
  const chosen = new Set(q.skills.map((x) => x.id));
  const options = useMemo(() => skills.map((k) => ({ id: k.id, label: k.label[locale] })).sort((a, b) => a.label.localeCompare(b.label, locale)), [locale]);

  const add = (value: string) => {
    const v = value.trim().toLowerCase();
    if (!v) return false;
    const hit = options.find((o) => o.label.toLowerCase() === v) ?? options.find((o) => o.label.toLowerCase().includes(v));
    if (!hit || chosen.has(hit.id)) return false;
    setQ({ ...q, skills: [...q.skills, { id: hit.id, priority: 'must' }] });
    setDraft('');
    return true;
  };
  const toggle = (id: string) =>
    setQ({ ...q, skills: q.skills.map((x) => (x.id === id ? { ...x, priority: (x.priority === 'must' ? 'nice' : 'must') as Priority } : x)) });
  const remove = (id: string) => setQ({ ...q, skills: q.skills.filter((x) => x.id !== id) });

  const select = (name: string, value: string | undefined, onChange: (v: string) => void, opts: { value: string; label: string }[]) => (
    <label>
      <span>{s[`req.${name}`]}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{s['req.any']}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="mt-picker">
      <div className="mt-selects">
        {select('role', q.role, (v) => setQ({ ...q, role: v || undefined }), roles.map((r) => ({ value: r.id, label: r.label[locale] })))}
        {select('sector', q.sector, (v) => setQ({ ...q, sector: v || undefined }), sectors.map((x) => ({ value: x.id, label: x.label[locale] })))}
        {select('level', q.seniority, (v) => setQ({ ...q, seniority: (v || undefined) as Seniority | undefined }), LEVELS.map((l) => ({ value: l, label: s[`level.${l}`] })))}
        {select('start', q.asap ? 'asap' : undefined, (v) => setQ({ ...q, asap: v === 'asap' || undefined }), [
          { value: 'asap', label: s['start.asap'] },
        ])}
      </div>

      <h3 id="mt-skills-title">{s.skills}</h3>
      {q.skills.length === 0 ? (
        <p className="muted small">{s.noSkills}</p>
      ) : (
        <ul className="mt-chips" aria-labelledby="mt-skills-title">
          {q.skills.map(({ id, priority }) => {
            const label = getSkill(id)!.label[locale];
            return (
              <li key={id} className={`mt-chip p-${priority}`} data-skill={id}>
                <span>{label}</span>
                <button type="button" className="mt-prio" onClick={() => toggle(id)} aria-label={fill(s.togglePriority, { skill: label })}>
                  {s[priority]}
                </button>
                <button type="button" className="mt-x" onClick={() => remove(id)} aria-label={fill(s.remove, { skill: label })}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="mt-add"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
      >
        <label htmlFor="mt-add-input" className="visually-hidden">
          {s.addSkill}
        </label>
        <input
          id="mt-add-input"
          list="mt-skill-list"
          value={draft}
          placeholder={s.addPlaceholder}
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value);
            // Picking from the datalist fires a change with the exact label.
            if (options.some((o) => o.label === e.target.value)) add(e.target.value);
          }}
        />
        <datalist id="mt-skill-list">
          {options
            .filter((o) => !chosen.has(o.id))
            .map((o) => (
              <option key={o.id} value={o.label} />
            ))}
        </datalist>
        <button type="submit" className="btn">
          {s.addSkill}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- output

function ScoreBar({ r, s, locale }: { r: MatchResult; s: Props['s']; locale: Locale }) {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  return (
    <div className="mt-bar" role="img" aria-label={`${s.score}: ${fmt(r.score, locale)}`}>
      <div className="mt-track">
        {[BAND_THRESHOLDS.partial, BAND_THRESHOLDS.nuanced, BAND_THRESHOLDS.strong].map((t) => (
          <span key={t} className="mt-tick" style={{ left: pct(t) }} />
        ))}
        <span className="mt-fill" style={{ width: pct(r.score) }} />
        {Math.abs(r.score - r.scoreWithoutPrior) > 0.005 && <span className="mt-ghost" style={{ left: pct(r.scoreWithoutPrior) }} />}
      </div>
      <div className="mt-scale" aria-hidden="true">
        <span>{s['scale.no']}</span>
        <span>{s['scale.partial']}</span>
        <span>{s['scale.nuanced']}</span>
        <span>{s['scale.strong']}</span>
      </div>
    </div>
  );
}

function Result({ r, q, locale, email, s, lenses }: { r: MatchResult; q: Query } & Props) {
  const count = (st: Status[]) => r.items.filter((i) => st.includes(i.status)).length;
  const prior = r.terms.find((t) => t.key === 'interest')!.value;
  const notes: string[] = [];
  if (r.capped) notes.push(s[`cap.${r.capped}`]);
  if (prior > 0 && r.band !== 'no' && r.sector && r.sector.interest !== 'neutral') notes.push(fill(s[`lean.${r.sector.interest}`], { sector: r.sector.label[locale].toLowerCase() }));
  if (q.asap) notes.push(s.asapNote);
  const subject = r.role ? fill(s.emailSubject, { role: r.role.label[locale] }) : s.emailSubjectGeneric;

  return (
    <div className={`mt-result b-${r.band}`} aria-live="polite">
      <p className="mt-kicker">{s.result}</p>
      <h2 className="mt-verdict" data-verdict={r.band}>
        {s[`band.${r.band}`]}
      </h2>
      <p className="mt-blurb">{s[`blurb.${r.band}`]}</p>
      <p className="mt-score">
        <span className="muted">{s.score}</span> <span className="num">{fmt(r.score, locale)}</span>
      </p>
      <ScoreBar r={r} s={s} locale={locale} />
      {r.items.length > 0 && (
        <p className="small">{fill(s.summary, { have: count(['have']), total: r.items.length, close: count(['adjacent', 'learning']), gaps: count(['gap']) })}</p>
      )}
      {r.bandWithoutPrior !== r.band || prior > 0 ? (
        <p className="small muted">{fill(s.withoutPrior, { band: s[`band.${r.bandWithoutPrior}`].toLowerCase(), score: fmt(r.scoreWithoutPrior, locale) })}</p>
      ) : null}
      {notes.length > 0 && (
        <ul className="mt-notes small">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {r.items.length > 0 && (
        <table className="mt-table">
          <thead>
            <tr>
              <th scope="col">{s['col.req']}</th>
              <th scope="col">{s['col.status']}</th>
              <th scope="col">{s['col.evidence']}</th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((i) => (
              <tr key={i.skill.id} data-status={i.status}>
                <th scope="row">
                  {i.skill.label[locale]}
                  <span className="mt-p">{s[i.priority]}</span>
                </th>
                <td className={`mt-st st-${i.status}`}>
                  <span aria-hidden="true">{GLYPH[i.status]}</span> {s[`status.${i.status}`]}
                  {i.via && <span className="mt-via">{fill(s.via, { skill: i.via.label[locale] })}</span>}
                </td>
                <td>
                  {i.evidence.length > 0 && (
                    <span className="mt-ev">
                      {i.evidence.slice(0, 2).map((e) => (
                        <a key={e.href + e.label.en} href={localePath(e.href, locale)}>
                          {e.label[locale]}
                        </a>
                      ))}
                    </span>
                  )}
                  {i.skill.note && <span className="mt-note">{i.skill.note[locale]}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <details className="mt-terms">
        <summary>{s.terms}</summary>
        <table>
          <tbody>
            {r.terms.map((t) => (
              <tr key={t.key}>
                <th scope="row">{s[`term.${t.key}`]}</th>
                <td className={`num delta ${t.value > 0 ? 'better' : t.value < 0 ? 'worse' : 'same'}`}>{fmt(t.value, locale, 2, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <div className="mt-next">
        {r.suggested.length > 0 && (
          <p className="small">
            <span className="muted">{s.next}:</span>{' '}
            {r.suggested.map((e, k) => (
              <span key={e.href}>
                {k > 0 && ', '}
                <a href={localePath(e.href, locale)}>{e.label[locale]}</a>
              </span>
            ))}
          </p>
        )}
        <p className="small">
          <a href={`${localePath('/', locale)}?lens=${r.lens}`} data-match-lens>
            {fill(s.lensLink, { lens: lenses[r.lens] })}
          </a>
        </p>
        <a className="btn btn-primary" href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>
          {s.email}
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- page

export default function Match({ locale, email, s, lenses }: Props) {
  const [text, setText] = useState('');
  const [q, setQ] = useState<Query>(emptyQuery);
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => score(q), [q]);

  useEffect(() => {
    const fromUrl = fromParams(new URLSearchParams(location.search));
    if (fromUrl.role || fromUrl.sector || fromUrl.skills.length) setQ(fromUrl);
  }, []);

  useEffect(() => {
    const url = new URL(location.href);
    const lens = url.searchParams.get('lens');
    const p = toParams(q);
    if (lens) p.set('lens', lens);
    const search = p.toString();
    history.replaceState(history.state, '', url.pathname + (search ? `?${search}` : ''));
  }, [q]);

  const read = (t = text) => {
    setQ(extract(t));
    // On one column the verdict sits below the form: bring it into view.
    if (matchMedia('(max-width: 960px)').matches) {
      requestAnimationFrame(() => document.getElementById('mt-output')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
    }
  };
  const pick = (id: string) => {
    const ex = examples.find((e) => e.id === id)!;
    if (MATCH_PASTE_ENABLED) setText(ex.text[locale]);
    read(ex.text[locale]);
  };
  const copy = () => {
    navigator.clipboard?.writeText(location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="mt">
      <section className="mt-input" aria-labelledby="mt-req-title">
        {MATCH_PASTE_ENABLED && <OfferPaste text={text} setText={setText} onRead={() => read()} s={s} />}
        <div className="mt-examples">
          <span className="muted small">{s.examples}</span>
          {examples.map((ex) => (
            <button key={ex.id} type="button" className="btn btn-ghost" onClick={() => pick(ex.id)} data-example={ex.id}>
              {ex.label[locale]}
            </button>
          ))}
        </div>

        <h2 id="mt-req-title">{s['req.title']}</h2>
        <p className="muted small">{s['req.hint']}</p>
        <Picker q={q} setQ={setQ} locale={locale} s={s} />
        <div className="mt-row">
          <button type="button" className="btn" onClick={copy} disabled={!result}>
            {copied ? s.copied : s.share}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setQ(emptyQuery());
              setText('');
            }}
          >
            {s.clear}
          </button>
        </div>
      </section>

      <section className="mt-output panel" id="mt-output" aria-label={s.result}>
        {result ? <Result r={result} q={q} locale={locale} email={email} s={s} lenses={lenses} /> : <p className="muted">{s.empty}</p>}
      </section>
    </div>
  );
}
