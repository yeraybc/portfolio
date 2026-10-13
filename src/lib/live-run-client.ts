// Drives the live-run chart: starts the worker, draws each epoch at the real pixel width,
// handles hover and restart. Without JS (or with reduced motion) the server-drawn final curve stays.
import { liveRunSvg, heightFor, pathFor, scales, PAD, type LiveRunGeometry } from './live-run-svg';

interface Config extends LiveRunGeometry {
  curve: number[];
  url: string;
}

export function initLiveRun(root: HTMLElement) {
  const cfg: Config = JSON.parse(root.dataset.config!);
  const strings = JSON.parse(root.dataset.strings!);
  const svg = root.querySelector<SVGSVGElement>('[data-chart]')!;
  const epochEl = root.querySelector('[data-epoch]')!;
  const valEl = root.querySelector('[data-val]')!;
  const pill = root.querySelector<HTMLElement>('[data-pill]')!;
  const staticNote = root.querySelector<HTMLElement>('.static-note');
  const restart = root.querySelector<HTMLButtonElement>('[data-restart]')!;
  const announce = root.querySelector('[data-announce]')!;

  const nf = new Intl.NumberFormat(document.documentElement.lang === 'es' ? 'es-ES' : 'en-GB', { useGrouping: 'always' });
  const labels = { epoch: strings.epoch, baseline: strings.baseline, fmt: (v: number) => nf.format(v) };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let points: number[] = cfg.curve.slice();
  let animating = false;
  let width = 640;
  let worker: Worker | null = null;

  const render = () => {
    width = Math.max(280, Math.round(svg.getBoundingClientRect().width) || 640);
    const H = heightFor(width);
    svg.setAttribute('viewBox', `0 0 ${width} ${H}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(H));
    svg.innerHTML = liveRunSvg(cfg, width, points, labels, animating ? undefined : cfg.curve);
    bindHover();
  };

  const drawProgress = () => {
    const path = svg.querySelector('[data-path]');
    const head = svg.querySelector('[data-head]');
    const { xs, ys } = scales(cfg, width);
    path?.setAttribute('d', pathFor(points, cfg, width));
    const last = points.at(-1);
    if (last !== undefined) {
      head?.setAttribute('cx', String(xs(points.length)));
      head?.setAttribute('cy', String(ys(last)));
      epochEl.textContent = String(points.length);
      valEl.textContent = nf.format(last);
    } else {
      head?.setAttribute('cx', String(xs(1)));
      head?.setAttribute('cy', String(ys(cfg.curve[0])));
    }
  };

  function bindHover() {
    const hit = svg.querySelector<SVGRectElement>('[data-hit]')!;
    const hover = svg.querySelector<SVGGElement>('[data-hover]')!;
    const cross = svg.querySelector<SVGLineElement>('[data-cross]')!;
    const lbl = svg.querySelector<SVGTextElement>('[data-hover-lbl]')!;
    hit.addEventListener('pointermove', (ev) => {
      if (!points.length) return;
      const box = svg.getBoundingClientRect();
      const x = ((ev.clientX - box.left) / box.width) * width;
      const e = Math.max(1, Math.min(points.length, Math.round(((x - PAD.l) / (width - PAD.l - PAD.r)) * (cfg.epochs - 1) + 1)));
      const { xs } = scales(cfg, width);
      const px = xs(e);
      cross.setAttribute('x1', String(px));
      cross.setAttribute('x2', String(px));
      lbl.textContent = `${strings.epoch} ${e}: ${nf.format(points[e - 1])} €/m²`;
      const right = px > width * 0.6;
      lbl.setAttribute('x', String(right ? px - 8 : px + 8));
      lbl.setAttribute('text-anchor', right ? 'end' : 'start');
      lbl.setAttribute('y', String(PAD.t + 12));
      hover.setAttribute('visibility', 'visible');
    });
    hit.addEventListener('pointerleave', () => hover.setAttribute('visibility', 'hidden'));
  }

  const setPill = (beats: boolean) => {
    pill.className = `pill ${beats ? 'done' : 'training'}`;
    pill.innerHTML = beats ? `<span aria-hidden="true">✓</span> ${strings.beats}` : `<span aria-hidden="true">◐</span> ${strings.training}`;
  };

  function fallback() {
    worker?.terminate();
    worker = null;
    animating = false;
    root.dataset.static = '';
    points = cfg.curve.slice();
    render();
    drawProgress();
    setPill(true);
    restart.hidden = true;
  }

  const start = () => {
    worker?.terminate();
    animating = true;
    points = [];
    render();
    drawProgress();
    staticNote?.remove();
    restart.hidden = true;
    setPill(false);
    let beaten = false;
    try {
      worker = new Worker(new URL('../workers/train.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      fallback();
      return;
    }
    worker.onerror = fallback;
    worker.onmessage = (e) => {
      if (e.data.type === 'epoch') {
        points.push(e.data.val);
        drawProgress();
        if (!beaten && e.data.val < cfg.ols) {
          beaten = true;
          setPill(true);
          announce.textContent = `${strings.beats}: ${strings.epoch} ${e.data.epoch}`;
        }
      } else if (e.data.type === 'done') {
        restart.hidden = false;
        worker?.terminate();
        worker = null;
      }
    };
    worker.postMessage({ type: 'start', url: cfg.url, delay: 70 });
  };

  restart.addEventListener('click', start);

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
  points = [];
  render();
  drawProgress();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        io.disconnect();
        start();
      }
    },
    { threshold: 0.3 },
  );
  io.observe(root);
}
