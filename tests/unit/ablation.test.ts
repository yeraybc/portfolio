import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { columnsFor, olsRmse, subset } from '../../src/lib/ablation';
import { FEATURES, FEATURE_SET_KEYS } from '../../src/lib/live-run-config';
import { kpis, lenses } from '../../src/data/profile';

const data = JSON.parse(readFileSync('public/data/live-run.json', 'utf8'));
const ols = (set: Parameters<typeof subset>[1]) => Math.round(olsRmse(subset(data, set)) * data.meta.y_std);

describe('ablation', () => {
  it('uses the same column order as the published dataset', () => {
    expect([...FEATURES]).toEqual(data.meta.features);
    expect(columnsFor('all')).toEqual(FEATURES.map((_, i) => i));
  });

  it('selects columns in order and keeps targets untouched', () => {
    const d = subset(data, 'house');
    const cols = columnsFor('house');
    expect(d.xTrain[0]).toEqual(cols.map((j) => data.xTrain[0][j]));
    expect(d.yVal).toBe(data.yVal);
    for (const set of FEATURE_SET_KEYS) expect(subset(data, set).xVal[0]).toHaveLength(columnsFor(set).length);
  });

  it('reproduces the published OLS baseline with all features', () => {
    expect(ols('all')).toBe(data.meta.ols_val_rmse);
  });

  it('tells the MadridDataHouse story: location beats the house, and the linear model needs the neighbour price', () => {
    expect(ols('location')).toBeLessThan(ols('house'));
    expect(ols('no_lag')).toBeGreaterThan(ols('all'));
  });
});

describe('home KPIs', () => {
  const runIds = new Set(readdirSync('src/content/runs').map((f) => f.replace(/\.yaml$/, '')));
  it('has five figures per lens, each linking to a page that exists', () => {
    for (const lens of lenses) {
      expect(kpis[lens]).toHaveLength(5);
      for (const k of kpis[lens]) {
        const run = k.href.match(/^\/runs\/(.+)$/)?.[1];
        if (run) expect(runIds.has(run), k.href).toBe(true);
        else expect(['/deployments', '/model-card']).toContain(k.href);
      }
    }
  });
});
