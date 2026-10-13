// Trains the live-run MLP off the main thread and streams one message per epoch.
import { Mlp, rmse } from '../lib/mlp';
import { LIVE_RUN } from '../lib/live-run-config';

interface LiveRunData {
  meta: { y_std: number };
  xTrain: number[][];
  yTrain: number[];
  xVal: number[][];
  yVal: number[];
}

let token = 0;

self.onmessage = async (e: MessageEvent<{ type: 'start'; url: string; delay: number }>) => {
  if (e.data.type !== 'start') return;
  const my = ++token;
  const data: LiveRunData = await (await fetch(e.data.url)).json();
  const mlp = new Mlp(data.xTrain[0].length, LIVE_RUN);
  for (let epoch = 1; epoch <= LIVE_RUN.epochs; epoch++) {
    if (my !== token) return;
    const trainMse = mlp.epoch(data.xTrain, data.yTrain);
    const val = rmse(mlp, data.xVal, data.yVal) * data.meta.y_std;
    self.postMessage({ type: 'epoch', epoch, val: Math.round(val), train: Math.sqrt(trainMse) * data.meta.y_std });
    await new Promise((r) => setTimeout(r, e.data.delay));
  }
  self.postMessage({ type: 'done' });
};
