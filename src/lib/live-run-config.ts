// Hyper-parameters of the in-browser live run. Shared by the worker and the data script,
// so the static (reduced-motion) curve is exactly the one the browser would draw.
export const LIVE_RUN = { hidden: 16, lr: 0.001, batch: 32, seed: 7, epochs: 100 } as const;

/** Column order of xTrain / xVal in public/data/live-run.json. */
export const FEATURES = [
  'neighbour_price_lag',
  'built_area',
  'age',
  'baths',
  'crime',
  'immigrants',
  'inside_m30',
  'elevator',
  'good_condition',
  'longitude',
  'latitude',
] as const;
export type Feature = (typeof FEATURES)[number];

/** Feature subsets the visitor can train on (the ablation presets). */
export type FeatureSet = 'all' | 'no_lag' | 'location' | 'house';
export const FEATURE_SETS: Record<FeatureSet, readonly Feature[]> = {
  all: FEATURES,
  no_lag: FEATURES.filter((f) => f !== 'neighbour_price_lag'),
  location: ['neighbour_price_lag', 'crime', 'immigrants', 'inside_m30', 'longitude', 'latitude'],
  house: ['built_area', 'age', 'baths', 'elevator', 'good_condition'],
};
export const FEATURE_SET_KEYS = Object.keys(FEATURE_SETS) as FeatureSet[];

export const HIDDEN_OPTIONS = [8, 16, 32] as const;
export const LR_OPTIONS = [0.0003, 0.001, 0.003] as const;

export interface RunConfig {
  set: FeatureSet;
  hidden: number;
  lr: number;
}
export const DEFAULT_RUN: RunConfig = { set: 'all', hidden: LIVE_RUN.hidden, lr: LIVE_RUN.lr };
