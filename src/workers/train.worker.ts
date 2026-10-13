// Trains the live-run MLP off the main thread: first the OLS baseline for the chosen features,
// then one message per epoch.
import { Mlp, rmse, type Dataset } from '../lib/mlp';
import { LIVE_RUN, type RunConfig } from '../lib/live-run-config';
import { olsRmse, subset } from '../lib/ablation';

interface LiveRunData extends Dataset {
  meta: { y_std: number };
}

let token = 0;
let cached: { url: string; data: Promise<LiveRunData> } | null = null;

const load = (url: string) => {
  if (cached?.url !== url) cached = { url, data: fetch(url).then((r) => r.json()) };
  return cached.data;
};

self.onmessage = async (e: MessageEvent<{ type: 'start'; url: string; delay: number; run: RunConfig }>) => {
  if (e.data.type !== 'start') return;
  const my = ++token;
  const { run, delay } = e.data;
  const data = await load(e.data.url);
  const d = subset(data, run.set);
  const yStd = data.meta.y_std;
  self.postMessage({ type: 'baseline', ols: Math.round(olsRmse(d) * yStd) });
  const mlp = new Mlp(d.xTrain[0].length, { ...LIVE_RUN, hidden: run.hidden, lr: run.lr });
  for (let epoch = 1; epoch <= LIVE_RUN.epochs; epoch++) {
    if (my !== token) return;
    mlp.epoch(d.xTrain, d.yTrain);
    self.postMessage({ type: 'epoch', epoch, val: Math.round(rmse(mlp, d.xVal, d.yVal) * yStd) });
    // Yield even without a delay, so a newer start message can cancel this run.
    await new Promise((r) => setTimeout(r, delay));
  }
  self.postMessage({ type: 'done' });
};
