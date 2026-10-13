import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Mlp, fitOls, mulberry32, rmse } from '../../src/lib/mlp';
import { LIVE_RUN } from '../../src/lib/live-run-config';

describe('mlp', () => {
  it('learns a non-linear function better than OLS', () => {
    const rand = mulberry32(1);
    const xs = Array.from({ length: 400 }, () => [rand() * 4 - 2, rand() * 4 - 2]);
    const ys = xs.map(([a, b]) => Math.sin(a) + 0.5 * b * b);
    const ols = fitOls(xs, ys);
    const mlp = new Mlp(2, { hidden: 16, lr: 0.01, batch: 32, seed: 3 });
    const first = mlp.epoch(xs, ys);
    let last = first;
    for (let i = 0; i < 150; i++) last = mlp.epoch(xs, ys);
    expect(last).toBeLessThan(first);
    expect(rmse(mlp, xs, ys)).toBeLessThan(rmse(ols, xs, ys));
  });

  it('reproduces the published live-run curve exactly (same seed, same data)', () => {
    const data = JSON.parse(readFileSync('public/data/live-run.json', 'utf8'));
    const mlp = new Mlp(data.xTrain[0].length, LIVE_RUN);
    const curve: number[] = [];
    for (let e = 0; e < LIVE_RUN.epochs; e++) {
      mlp.epoch(data.xTrain, data.yTrain);
      curve.push(Math.round(rmse(mlp, data.xVal, data.yVal) * data.meta.y_std));
    }
    expect(curve).toEqual(data.curve);
    expect(curve.at(-1)!).toBeLessThan(data.meta.ols_val_rmse);
  });
});
