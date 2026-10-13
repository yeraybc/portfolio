// Builds public/data/live-run.json for the in-browser "live run" on the home page.
// Source: MadridDataHouse/data/raw/Data_Housing_Madrid.csv (public repo yeraybc/MadridDataHouse).
// Usage: node scripts/build-live-run-data.ts [path/to/Data_Housing_Madrid.csv]
import { readFileSync, writeFileSync } from 'node:fs';
import { Mlp, fitOls, mulberry32, rmse } from '../src/lib/mlp.ts';
import { FEATURES, LIVE_RUN } from '../src/lib/live-run-config.ts';

const csvPath = process.argv[2] ?? '../MadridDataHouse/data/raw/Data_Housing_Madrid.csv';
const N_TOTAL = 2000;
const N_TRAIN = 1600;
const K = 8;

const lines = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const header = lines[0].split(',').map((h) => h.replaceAll('"', ''));
const col = (name: string) => header.indexOf(name);
const rows = lines.slice(1).map((l) => l.split(',').map((v) => v.replaceAll('"', '')));

interface House { price: number; lon: number; lat: number; f: number[] }
const houses: House[] = [];
for (const r of rows) {
  const num = (c: string) => Number(r[col(c)]);
  const elevator = r[col('elevator')];
  const cond = r[col('good.cond')];
  if (elevator === 'ZZZ' || cond === 'ZZZ') continue;
  const vals = [num('built.area'), num('age'), num('baths'), num('crime'), num('immigrants'), num('M.30'), elevator === 'si' ? 1 : 0, cond === 'bueno' ? 1 : 0];
  const h = { price: num('house.price'), lon: num('longitude'), lat: num('latitude'), f: vals };
  if ([h.price, h.lon, h.lat, ...vals].every(Number.isFinite)) houses.push(h);
}

const rand = mulberry32(2026);
for (let i = houses.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [houses[i], houses[j]] = [houses[j], houses[i]];
}
const sample = houses.slice(0, N_TOTAL);
const train = sample.slice(0, N_TRAIN);
const val = sample.slice(N_TRAIN);

// Spatial lag of price: mean of the K nearest *training* houses (never val), excluding self.
const cosLat = Math.cos((40.42 * Math.PI) / 180);
function lag(h: House): number {
  const d = train
    .filter((t) => t !== h)
    .map((t) => ({ p: t.price, d: ((t.lon - h.lon) * cosLat) ** 2 + (t.lat - h.lat) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, K);
  return d.reduce((s, x) => s + x.p, 0) / K;
}

// Same order as FEATURES: lag, the 8 house/area columns, then coordinates.
const featureNames = [...FEATURES];
const raw = (h: House) => [lag(h), ...h.f, h.lon, h.lat];
const xTrainRaw = train.map(raw);
const xValRaw = val.map(raw);

const p = featureNames.length;
const mean = Array.from({ length: p }, (_, j) => xTrainRaw.reduce((s, r) => s + r[j], 0) / N_TRAIN);
const std = Array.from({ length: p }, (_, j) => Math.sqrt(xTrainRaw.reduce((s, r) => s + (r[j] - mean[j]) ** 2, 0) / N_TRAIN) || 1);
const yMean = train.reduce((s, h) => s + h.price, 0) / N_TRAIN;
// Rounded once and used everywhere, so the browser reproduces the published curve exactly.
const yStd = Math.round(Math.sqrt(train.reduce((s, h) => s + (h.price - yMean) ** 2, 0) / N_TRAIN) * 100) / 100;

const r2 = (v: number) => Math.round(v * 100) / 100;
const norm = (r: number[]) => r.map((v, j) => r2((v - mean[j]) / std[j]));
const xTrain = xTrainRaw.map(norm);
const xVal = xValRaw.map(norm);
const yTrain = train.map((h) => r2((h.price - yMean) / yStd));
const yVal = val.map((h) => r2((h.price - yMean) / yStd));

const ols = fitOls(xTrain, yTrain);
const olsVal = rmse(ols, xVal, yVal) * yStd;

const mlp = new Mlp(p, LIVE_RUN);
const curve: number[] = [];
for (let e = 0; e < LIVE_RUN.epochs; e++) {
  mlp.epoch(xTrain, yTrain);
  curve.push(Math.round(rmse(mlp, xVal, yVal) * yStd));
}
const best = Math.min(...curve);
const firstBeat = curve.findIndex((v) => v < olsVal);
console.log(`OLS val RMSE: ${olsVal.toFixed(1)} €/m² | MLP final ${curve.at(-1)} best ${best} | beats baseline at epoch ${firstBeat + 1}`);
if (firstBeat < 0) {
  console.error('MLP does not beat OLS on this sample: revise features before publishing.');
  process.exit(1);
}

writeFileSync(
  'public/data/live-run.json',
  JSON.stringify({
    meta: {
      source: 'yeraybc/MadridDataHouse · data/raw/Data_Housing_Madrid.csv',
      unit: '€/m²',
      n_train: N_TRAIN,
      n_val: val.length,
      features: featureNames,
      y_std: yStd,
      ols_val_rmse: Math.round(olsVal),
    },
    curve,
    xTrain,
    yTrain,
    xVal,
    yVal,
  }),
);
console.log('wrote public/data/live-run.json');
