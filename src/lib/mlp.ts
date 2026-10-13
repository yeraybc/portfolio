// Tiny dependency-free MLP (one hidden layer, tanh) trained with Adam on MSE.
// Shared by the browser worker and the offline data script / tests.

export interface Dataset {
  xTrain: number[][];
  yTrain: number[];
  xVal: number[][];
  yVal: number[];
}

export interface MlpOptions {
  hidden: number;
  lr: number;
  batch: number;
  seed: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Mlp {
  readonly nIn: number;
  readonly nHidden: number;
  private w1: Float64Array;
  private b1: Float64Array;
  private w2: Float64Array;
  private b2 = 0;
  private m: Float64Array;
  private v: Float64Array;
  private step = 0;
  private rand: () => number;
  private opts: MlpOptions;

  constructor(nIn: number, opts: MlpOptions) {
    this.nIn = nIn;
    this.nHidden = opts.hidden;
    this.opts = opts;
    this.rand = mulberry32(opts.seed);
    const scale1 = Math.sqrt(1 / nIn);
    const scale2 = Math.sqrt(1 / opts.hidden);
    this.w1 = Float64Array.from({ length: nIn * opts.hidden }, () => (this.rand() * 2 - 1) * scale1);
    this.b1 = new Float64Array(opts.hidden);
    this.w2 = Float64Array.from({ length: opts.hidden }, () => (this.rand() * 2 - 1) * scale2);
    const nParams = this.w1.length + this.b1.length + this.w2.length + 1;
    this.m = new Float64Array(nParams);
    this.v = new Float64Array(nParams);
  }

  predict(x: number[]): number {
    const { nIn, nHidden, w1, b1, w2 } = this;
    let out = this.b2;
    for (let j = 0; j < nHidden; j++) {
      let s = b1[j];
      for (let i = 0; i < nIn; i++) s += x[i] * w1[i * nHidden + j];
      out += Math.tanh(s) * w2[j];
    }
    return out;
  }

  /** One pass over the training data in shuffled minibatches. Returns mean train MSE. */
  epoch(xs: number[][], ys: number[]): number {
    const { nIn, nHidden } = this;
    const idx = Array.from(xs.keys());
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const nParams = this.m.length;
    const grad = new Float64Array(nParams);
    const h = new Float64Array(nHidden);
    let lossSum = 0;
    for (let start = 0; start < idx.length; start += this.opts.batch) {
      grad.fill(0);
      const end = Math.min(start + this.opts.batch, idx.length);
      for (let k = start; k < end; k++) {
        const x = xs[idx[k]];
        let out = this.b2;
        for (let j = 0; j < nHidden; j++) {
          let s = this.b1[j];
          for (let i = 0; i < nIn; i++) s += x[i] * this.w1[i * nHidden + j];
          h[j] = Math.tanh(s);
          out += h[j] * this.w2[j];
        }
        const err = out - ys[idx[k]];
        lossSum += err * err;
        const dOut = 2 * err;
        const offB1 = this.w1.length;
        const offW2 = offB1 + nHidden;
        for (let j = 0; j < nHidden; j++) {
          grad[offW2 + j] += dOut * h[j];
          const dh = dOut * this.w2[j] * (1 - h[j] * h[j]);
          grad[offB1 + j] += dh;
          for (let i = 0; i < nIn; i++) grad[i * nHidden + j] += dh * x[i];
        }
        grad[nParams - 1] += dOut;
      }
      this.adam(grad, end - start);
    }
    return lossSum / idx.length;
  }

  private adam(grad: Float64Array, n: number) {
    const beta1 = 0.9;
    const beta2 = 0.999;
    const eps = 1e-8;
    this.step++;
    const c1 = 1 - beta1 ** this.step;
    const c2 = 1 - beta2 ** this.step;
    const lr = this.opts.lr;
    const params: [Float64Array, number][] = [
      [this.w1, 0],
      [this.b1, this.w1.length],
      [this.w2, this.w1.length + this.b1.length],
    ];
    for (const [arr, off] of params) {
      for (let p = 0; p < arr.length; p++) {
        const g = grad[off + p] / n;
        this.m[off + p] = beta1 * this.m[off + p] + (1 - beta1) * g;
        this.v[off + p] = beta2 * this.v[off + p] + (1 - beta2) * g * g;
        arr[p] -= (lr * (this.m[off + p] / c1)) / (Math.sqrt(this.v[off + p] / c2) + eps);
      }
    }
    const last = this.m.length - 1;
    const g = grad[last] / n;
    this.m[last] = beta1 * this.m[last] + (1 - beta1) * g;
    this.v[last] = beta2 * this.v[last] + (1 - beta2) * g * g;
    this.b2 -= (lr * (this.m[last] / c1)) / (Math.sqrt(this.v[last] / c2) + eps);
  }
}

export function rmse(model: { predict(x: number[]): number }, xs: number[][], ys: number[]): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    const e = model.predict(xs[i]) - ys[i];
    s += e * e;
  }
  return Math.sqrt(s / xs.length);
}

/** Ordinary least squares via normal equations (with intercept), solved by Gaussian elimination. */
export function fitOls(xs: number[][], ys: number[]): { predict(x: number[]): number; coef: number[] } {
  const p = xs[0].length + 1;
  const a = Array.from({ length: p }, () => new Array<number>(p + 1).fill(0));
  for (let r = 0; r < xs.length; r++) {
    const row = [1, ...xs[r]];
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) a[i][j] += row[i] * row[j];
      a[i][p] += row[i] * ys[r];
    }
  }
  for (let c = 0; c < p; c++) {
    let piv = c;
    for (let r = c + 1; r < p; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    [a[c], a[piv]] = [a[piv], a[c]];
    for (let r = 0; r < p; r++) {
      if (r === c) continue;
      const f = a[r][c] / a[c][c];
      for (let k = c; k <= p; k++) a[r][k] -= f * a[c][k];
    }
  }
  const coef = a.map((row, i) => row[p] / row[i]);
  return {
    coef,
    predict: (x: number[]) => coef[0] + x.reduce((s, xi, i) => s + xi * coef[i + 1], 0),
  };
}
