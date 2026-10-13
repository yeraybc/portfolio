import { useEffect, useMemo, useState } from 'react';
import { toYamlLines } from '../lib/yaml';
import { deltaPct, direction, showPct } from '../lib/metrics';

export interface CompareMetric {
  name: string;
  unit?: string;
  baseline: number;
  value: number;
  lower_is_better?: boolean;
  target?: number;
  decimals?: number;
  reported_pct?: number;
  approx_baseline?: boolean;
  significance?: string;
}

export interface CompareRun {
  id: string;
  title: string;
  href: string;
  status: string;
  statusLabel: string;
  summary: string;
  year: string;
  baselineLabel?: string;
  sealed?: string;
  headline?: string;
  metrics: CompareMetric[];
  engineering: { label: string; value: string }[];
  stack: string[];
  config: Record<string, unknown>;
}

interface Props {
  locale: 'en' | 'es';
  runs: CompareRun[];
  strings: {
    a: string;
    b: string;
    metric: string;
    noMetric: string;
    share: string;
    copied: string;
    config: string;
    metrics: string;
    stack: string;
    sealed: string;
    open: string;
    shared: string;
  };
}

const GLYPH: Record<string, string> = { production: '●', running: '◐', training: '◐', pilot: '◇', research: '▲', archived: '○' };

function fmt(v: number, locale: string, decimals?: number) {
  const d = decimals ?? (Number.isInteger(v) ? 0 : 2);
  return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' })
    .format(v)
    .replace('-', '−');
}
function fmtPct(v: number, locale: string, d = 1) {
  const s = v > 0 ? '+' : v < 0 ? '−' : '';
  const b = new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(Math.abs(v));
  return locale === 'es' ? `${s}${b} %` : `${s}${b}%`;
}
const unit = (v: string, u?: string) => (!u ? v : u === '%' ? `${v}%` : `${v} ${u}`);

function Column({ run, locale, s }: { run: CompareRun; locale: string; s: Props['strings'] }) {
  return (
    <div className="cmp-col">
      <div className="cmp-head">
        <span className={`cmp-status st-${run.status}`}>
          <span aria-hidden="true">{GLYPH[run.status]}</span> {run.statusLabel}
        </span>
        <span className="num muted">{run.year}</span>
      </div>
      <h2>
        <a href={run.href}>{run.title}</a>
      </h2>
      <p className="cmp-sum">{run.summary}</p>

      <h3>{s.metrics}</h3>
      {run.sealed && (
        <p className="cmp-sealed">
          <span aria-hidden="true">■</span> {s.sealed}
        </p>
      )}
      {run.metrics.length === 0 && !run.sealed && <p className="muted small">{run.headline ?? s.noMetric}</p>}
      {run.metrics.length > 0 && (
        <table className="cmp-metrics">
          <thead>
            <tr>
              <th scope="col">{s.metric}</th>
              <th scope="col" className="r">
                {run.baselineLabel ?? 'Baseline'}
              </th>
              <th scope="col" className="r">
                Final
              </th>
              <th scope="col" className="r">
                Δ
              </th>
            </tr>
          </thead>
          <tbody>
            {run.metrics.map((m) => {
              const dir = direction(m);
              const pct = deltaPct(m);
              return (
                <tr key={m.name}>
                  <th scope="row">{m.name}</th>
                  <td className="num r">{unit(`${m.approx_baseline ? '~' : ''}${fmt(m.baseline, locale, m.decimals)}`, m.unit)}</td>
                  <td className="num r">{unit(fmt(m.value, locale, m.decimals), m.unit)}</td>
                  <td className={`num r delta ${dir}`}>
                    <span aria-hidden="true">{m.value < m.baseline ? '▼' : m.value > m.baseline ? '▲' : '■'}</span>
                    {showPct(m) && pct !== null ? ` ${fmtPct(pct, locale, Number.isInteger(m.reported_pct) ? 0 : 1)}` : ''}
                    <span className="visually-hidden">{dir}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {run.engineering.length > 0 && (
        <dl className="cmp-eng">
          {run.engineering.map((e) => (
            <div key={e.label}>
              <dt>{e.label}</dt>
              <dd className="num">{e.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <h3>{s.stack}</h3>
      <p className="cmp-stack">
        {run.stack.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </p>

      <h3>{s.config}</h3>
      <pre className="cmp-config" tabIndex={0}>
        <code>
          {toYamlLines(run.config).map((line, i) => (
            <span key={i}>
              {line.map((tok, j) => (
                <span key={j} className={`tk-${tok.kind}`}>
                  {tok.text}
                </span>
              ))}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

export default function Compare({ locale, runs, strings: s }: Props) {
  const ids = runs.map((r) => r.id);
  const [a, setA] = useState(ids[0]);
  const [b, setB] = useState(ids[1]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const pa = p.get('a');
    const pb = p.get('b');
    const na = pa && ids.includes(pa) ? pa : ids[0];
    const nb = pb && ids.includes(pb) && pb !== na ? pb : ids.find((id) => id !== na)!;
    setA(na);
    setB(nb);
  }, []);

  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('a', a);
    url.searchParams.set('b', b);
    history.replaceState(history.state, '', url.pathname + url.search);
  }, [a, b]);

  const runA = runs.find((r) => r.id === a)!;
  const runB = runs.find((r) => r.id === b)!;
  const shared = useMemo(() => runA.stack.filter((t) => runB.stack.includes(t)), [runA, runB]);

  const copy = () => {
    navigator.clipboard?.writeText(location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="cmp">
      <div className="cmp-pickers">
        <label>
          <span>{s.a}</span>
          <select value={a} onChange={(e) => setA(e.target.value)}>
            {runs.map((r) => (
              <option key={r.id} value={r.id} disabled={r.id === b}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{s.b}</span>
          <select value={b} onChange={(e) => setB(e.target.value)}>
            {runs.map((r) => (
              <option key={r.id} value={r.id} disabled={r.id === a}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={copy}>
          {copied ? s.copied : s.share}
        </button>
      </div>
      {shared.length > 0 && (
        <p className="cmp-shared small">
          <span className="muted">{s.shared}:</span> {shared.join(', ')}
        </p>
      )}
      <div className="cmp-grid">
        <Column run={runA} locale={locale} s={s} />
        <Column run={runB} locale={locale} s={s} />
      </div>
    </div>
  );
}
