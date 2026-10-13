// Pure SVG markup for the live-run chart, drawn at the real pixel width so text never scales.
export interface LiveRunGeometry {
  epochs: number;
  ols: number;
  yMin: number;
  yMax: number;
}
export interface LiveRunLabels {
  epoch: string;
  baseline: string;
  fmt: (v: number) => string;
}

export const PAD = { l: 48, r: 16, t: 16, b: 28 };

export function heightFor(width: number) {
  return width < 480 ? 200 : 240;
}

export function scales(g: LiveRunGeometry, width: number) {
  const H = heightFor(width);
  const xs = (e: number) => PAD.l + ((e - 1) / (g.epochs - 1)) * (width - PAD.l - PAD.r);
  const ys = (v: number) => PAD.t + ((g.yMax - Math.min(v, g.yMax)) / (g.yMax - g.yMin)) * (H - PAD.t - PAD.b);
  return { H, xs, ys };
}

export function pathFor(points: number[], g: LiveRunGeometry, width: number) {
  const { xs, ys } = scales(g, width);
  return points.map((v, i) => `${i ? 'L' : 'M'}${xs(i + 1).toFixed(1)},${ys(v).toFixed(1)}`).join('');
}

/** Y range rounded to hundreds with some air, covering every curve and the baseline. */
export function yRange(values: number[]): { yMin: number; yMax: number } {
  return { yMax: Math.ceil((Math.max(...values) + 40) / 100) * 100, yMin: Math.floor((Math.min(...values) - 40) / 100) * 100 };
}

export function liveRunSvg(g: LiveRunGeometry, width: number, points: number[], l: LiveRunLabels, staticCurve?: number[], previous: number[][] = []) {
  const { H, xs, ys } = scales(g, width);
  const ticks: number[] = [];
  const step = g.yMax - g.yMin > 600 ? 200 : 100;
  for (let v = g.yMin; v <= g.yMax; v += step) ticks.push(v);
  const last = points.at(-1);
  const head = last === undefined ? { x: xs(1), y: ys(staticCurve?.[0] ?? g.yMax) } : { x: xs(points.length), y: ys(last) };
  return `
  ${ticks
    .map((v) => `<line x1="${PAD.l}" x2="${width - PAD.r}" y1="${ys(v)}" y2="${ys(v)}" class="grid"/><text x="${PAD.l - 8}" y="${ys(v) + 4}" text-anchor="end" class="tick">${l.fmt(v)}</text>`)
    .join('')}
  <text x="${PAD.l}" y="${H - 6}" class="tick">1</text>
  <text x="${width - PAD.r}" y="${H - 6}" class="tick" text-anchor="end">${g.epochs}</text>
  <text x="${(width + PAD.l) / 2}" y="${H - 6}" class="tick" text-anchor="middle">${l.epoch}</text>
  <line x1="${PAD.l}" x2="${width - PAD.r}" y1="${ys(g.ols)}" y2="${ys(g.ols)}" class="ols"/>
  <text x="${width - PAD.r}" y="${ys(g.ols) - 6}" text-anchor="end" class="ols-lbl">${l.baseline} ${l.fmt(g.ols)}</text>
  ${previous.map((c) => `<path d="${pathFor(c, g, width)}" class="curve curve-prev"/>`).join('')}
  ${staticCurve ? `<path d="${pathFor(staticCurve, g, width)}" class="curve curve-static"/>` : ''}
  <path d="${pathFor(points, g, width)}" class="curve curve-live" data-path/>
  <circle r="4" class="head" data-head cx="${head.x}" cy="${head.y}"/>
  <g class="hover" data-hover visibility="hidden"><line y1="${PAD.t}" y2="${H - PAD.b}" class="cross" data-cross/><text class="hover-lbl" data-hover-lbl></text></g>
  <rect x="${PAD.l}" y="${PAD.t}" width="${width - PAD.l - PAD.r}" height="${H - PAD.t - PAD.b}" fill="transparent" data-hit/>`;
}
