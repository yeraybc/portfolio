// Drives the live-run panel: starts the worker, draws each epoch at the real pixel width, handles hover,
// the ablation controls and the table of runs in this session. Without JS (or with reduced motion)
// the server-drawn final curve and the default row stay.
import { liveRunSvg, heightFor, pathFor, scales, yRange, PAD, type LiveRunGeometry } from './live-run-svg';
import { fmtNum, fmtPct } from './format';
import { FEATURE_SET_KEYS, type FeatureSet, type RunConfig } from './live-run-config';

interface Config extends LiveRunGeometry {
  curve: number[];
  url: string;
  run: RunConfig;
}

interface Run {
  cfg: RunConfig;
  labels: { set: string; lr: string };
  ols: number | null;
  curve: number[];
  done: boolean;
  row: HTMLTableRowElement;
}

const MAX_RUNS = 6;

export function initLiveRun(root: HTMLElement) {
  const cfg: Config = JSON.parse(root.dataset.config!);
  const strings = JSON.parse(root.dataset.strings!);
  const svg = root.querySelector<SVGSVGElement>('[data-chart]')!;
  const epochEl = root.querySelector('[data-epoch]')!;
  const valEl = root.querySelector('[data-val]')!;
  const baseEl = root.querySelector('[data-base]')!;
  const pill = root.querySelector<HTMLElement>('[data-pill]')!;
  const staticNote = root.querySelector<HTMLElement>('.static-note');
  const form = root.querySelector<HTMLFormElement>('[data-controls]')!;
  const tbody = root.querySelector<HTMLTableSectionElement>('[data-exp]')!;
  const announce = root.querySelector('[data-announce]')!;

  const locale = document.documentElement.lang === 'es' ? 'es' : 'en';
  const fmt = (v: number) => fmtNum(v, locale, 0);
  const labels = { epoch: strings.epoch, baseline: strings.baseline, fmt };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The default run, exactly as the server rendered it. New rows are clones of its row,
  // so they keep the component's scoped styles.
  const template = tbody.querySelector('tr')!;
  const cell = (row: HTMLTableRowElement, i: number) => row.children[i] as HTMLElement;
  const runs: Run[] = [
    {
      cfg: cfg.run,
      labels: { set: cell(template, 0).textContent!, lr: cell(template, 2).textContent! },
      ols: cfg.ols,
      curve: cfg.curve.slice(),
      done: true,
      row: template,
    },
  ];
  let current = runs[0];
  let geom: LiveRunGeometry = { epochs: cfg.epochs, ols: cfg.ols, yMin: cfg.yMin, yMax: cfg.yMax };
  let animating = false;
  let width = 640;
  let worker: Worker | null = null;
  let autoStart: IntersectionObserver | null = null;

  /** Fits the Y range to every curve and the current baseline, never tighter than the published one. */
  const fitGeom = (): boolean => {
    const values = [...runs.flatMap((r) => r.curve), cfg.yMin + 40, cfg.yMax - 40];
    if (current.ols !== null) values.push(current.ols);
    const next = { epochs: cfg.epochs, ols: current.ols ?? geom.ols, ...yRange(values) };
    const changed = next.yMin !== geom.yMin || next.yMax !== geom.yMax || next.ols !== geom.ols;
    geom = next;
    return changed;
  };

  const render = () => {
    width = Math.max(280, Math.round(svg.getBoundingClientRect().width) || 640);
    const H = heightFor(width);
    svg.setAttribute('viewBox', `0 0 ${width} ${H}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(H));
    const previous = runs.filter((r) => r !== current && r.curve.length).map((r) => r.curve);
    svg.innerHTML = liveRunSvg(geom, width, current.curve, labels, animating ? undefined : current.curve, previous);
    bindHover();
  };

  const drawProgress = () => {
    const path = svg.querySelector('[data-path]');
    const head = svg.querySelector('[data-head]');
    const { xs, ys } = scales(geom, width);
    const points = current.curve;
    path?.setAttribute('d', pathFor(points, geom, width));
    const last = points.at(-1);
    if (last !== undefined) {
      head?.setAttribute('cx', String(xs(points.length)));
      head?.setAttribute('cy', String(ys(last)));
      epochEl.textContent = String(points.length);
      valEl.textContent = fmt(last);
    } else {
      head?.setAttribute('cx', String(xs(1)));
      head?.setAttribute('cy', String(ys(geom.yMax)));
      epochEl.textContent = '0';
      valEl.textContent = '…';
    }
    baseEl.textContent = current.ols === null ? '…' : fmt(current.ols);
  };

  function bindHover() {
    const hit = svg.querySelector<SVGRectElement>('[data-hit]')!;
    const hover = svg.querySelector<SVGGElement>('[data-hover]')!;
    const cross = svg.querySelector<SVGLineElement>('[data-cross]')!;
    const lbl = svg.querySelector<SVGTextElement>('[data-hover-lbl]')!;
    hit.addEventListener('pointermove', (ev) => {
      const points = current.curve;
      if (!points.length) return;
      const box = svg.getBoundingClientRect();
      const x = ((ev.clientX - box.left) / box.width) * width;
      const e = Math.max(1, Math.min(points.length, Math.round(((x - PAD.l) / (width - PAD.l - PAD.r)) * (geom.epochs - 1) + 1)));
      const { xs } = scales(geom, width);
      const px = xs(e);
      cross.setAttribute('x1', String(px));
      cross.setAttribute('x2', String(px));
      lbl.textContent = `${strings.epoch} ${e}: ${fmt(points[e - 1])} €/m²`;
      const right = px > width * 0.6;
      lbl.setAttribute('x', String(right ? px - 8 : px + 8));
      lbl.setAttribute('text-anchor', right ? 'end' : 'start');
      lbl.setAttribute('y', String(PAD.t + 12));
      hover.setAttribute('visibility', 'visible');
    });
    hit.addEventListener('pointerleave', () => hover.setAttribute('visibility', 'hidden'));
  }

  const setPill = (state: 'training' | 'beats' | 'miss') => {
    pill.className = `pill ${state === 'beats' ? 'done' : state}`;
    const icon = state === 'beats' ? '✓' : state === 'miss' ? '✗' : '◐';
    const text = state === 'beats' ? strings.beats : state === 'miss' ? strings.miss : strings.training;
    pill.innerHTML = `<span aria-hidden="true">${icon}</span> ${text}`;
  };

  const fillRow = (run: Run) => {
    const { row } = run;
    const last = run.curve.at(-1);
    cell(row, 0).textContent = run.labels.set;
    cell(row, 1).textContent = String(run.cfg.hidden);
    cell(row, 2).textContent = run.labels.lr;
    cell(row, 3).textContent = run.ols === null ? '…' : fmt(run.ols);
    cell(row, 4).textContent = last === undefined ? '…' : fmt(last);
    const delta = cell(row, 5).querySelector('.delta')!;
    if (run.done && last !== undefined && run.ols !== null) {
      const pct = ((last - run.ols) / run.ols) * 100;
      delta.className = `delta ${pct < 0 ? 'better' : 'worse'}`;
      delta.textContent = fmtPct(pct, locale);
    } else {
      delta.className = 'delta';
      delta.textContent = '…';
    }
    runs.forEach((r) => r.row.classList.toggle('current', r === current));
  };

  const drop = (run: Run) => {
    runs.splice(runs.indexOf(run), 1);
    run.row.remove();
  };

  /** An interrupted run: the default one is deterministic, so it gets its published result back. */
  const abandon = (run: Run) => {
    if (run.row !== template) return drop(run);
    Object.assign(run, { curve: cfg.curve.slice(), ols: cfg.ols, done: true });
    fillRow(run);
  };

  function fallback() {
    worker?.terminate();
    worker = null;
    animating = false;
    root.dataset.static = '';
    // Back to the published default run; unfinished visitor runs are discarded.
    runs.filter((r) => !r.done).forEach(abandon);
    current = runs.find((r) => r.row === template) ?? runs[0];
    fitGeom();
    render();
    drawProgress();
    runs.forEach(fillRow);
    setPill(current.curve.at(-1)! < current.ols! ? 'beats' : 'miss');
  }

  const start = (run: Run) => {
    worker?.terminate();
    if (current !== run && !current.done) abandon(current);
    current = run;
    run.curve = [];
    run.ols = null;
    run.done = false;
    animating = true;
    fitGeom();
    render();
    drawProgress();
    fillRow(run);
    staticNote?.remove();
    setPill('training');
    let beaten = false;
    try {
      worker = new Worker(new URL('../workers/train.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      fallback();
      return;
    }
    worker.onerror = fallback;
    worker.onmessage = (e) => {
      if (e.data.type === 'baseline') {
        run.ols = e.data.ols;
        fitGeom();
        render();
        drawProgress();
        fillRow(run);
      } else if (e.data.type === 'epoch') {
        run.curve.push(e.data.val);
        if (reduce) return;
        if (fitGeom()) render();
        drawProgress();
        fillRow(run);
        if (!beaten && run.ols !== null && e.data.val < run.ols) {
          beaten = true;
          setPill('beats');
          announce.textContent = `${strings.beats}: ${strings.epoch} ${e.data.epoch}`;
        }
      } else if (e.data.type === 'done') {
        worker?.terminate();
        worker = null;
        run.done = true;
        animating = false;
        const last = run.curve.at(-1)!;
        const beats = run.ols !== null && last < run.ols;
        setPill(beats ? 'beats' : 'miss');
        fitGeom();
        render();
        drawProgress();
        fillRow(run);
        announce.textContent = `${run.labels.set}: OLS ${fmt(run.ols!)}, MLP ${fmt(last)}. ${beats ? strings.beats : strings.miss}.`;
      }
    };
    worker.postMessage({ type: 'start', url: cfg.url, delay: reduce ? 0 : 70, run: run.cfg });
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    // A visitor run before the automatic one started: keep the published curve as the default row.
    if (autoStart) {
      autoStart.disconnect();
      autoStart = null;
      runs[0].curve = cfg.curve.slice();
    }
    const fd = new FormData(form);
    const set = fd.get('set') as FeatureSet;
    if (!FEATURE_SET_KEYS.includes(set)) return;
    const pick = (name: string) => form.querySelector<HTMLSelectElement>(`select[name="${name}"]`)!.selectedOptions[0].textContent!;
    const row = template.cloneNode(true) as HTMLTableRowElement;
    tbody.prepend(row);
    const run: Run = {
      cfg: { set, hidden: Number(fd.get('hidden')), lr: Number(fd.get('lr')) },
      labels: { set: pick('set'), lr: pick('lr') },
      ols: null,
      curve: [],
      done: false,
      row,
    };
    if (!current.done) abandon(current);
    runs.push(run);
    while (runs.length > MAX_RUNS) drop(runs[0]);
    start(run);
  });

  let lastWidth = 0;
  new ResizeObserver(() => {
    const w = Math.round(svg.getBoundingClientRect().width);
    if (Math.abs(w - lastWidth) < 2) return;
    lastWidth = w;
    render();
    drawProgress();
  }).observe(root);

  if (reduce) {
    render();
    return;
  }

  // Start when the chart is on screen, so the visitor actually sees it train.
  animating = true;
  current.curve = [];
  render();
  drawProgress();
  autoStart = new IntersectionObserver(
    (entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        autoStart?.disconnect();
        autoStart = null;
        start(runs[0]);
      }
    },
    { threshold: 0.3 },
  );
  autoStart.observe(root);
}
