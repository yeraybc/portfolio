// Feature ablation for the live run: train on a subset of columns and give every subset
// its own OLS baseline, so the network is always judged against a linear model that saw the same inputs.
import { FEATURES, FEATURE_SETS, type FeatureSet } from './live-run-config';
import { fitOls, rmse, type Dataset } from './mlp';

export function columnsFor(set: FeatureSet): number[] {
  return FEATURE_SETS[set].map((f) => FEATURES.indexOf(f));
}

export function selectColumns(xs: number[][], cols: number[]): number[][] {
  return xs.map((row) => cols.map((j) => row[j]));
}

export function subset(data: Dataset, set: FeatureSet): Dataset {
  if (set === 'all') return data;
  const cols = columnsFor(set);
  return { xTrain: selectColumns(data.xTrain, cols), yTrain: data.yTrain, xVal: selectColumns(data.xVal, cols), yVal: data.yVal };
}

/** Validation RMSE of an OLS fitted on the training rows, in standardised units. */
export function olsRmse(data: Dataset): number {
  return rmse(fitOls(data.xTrain, data.yTrain), data.xVal, data.yVal);
}
