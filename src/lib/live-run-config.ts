// Hyper-parameters of the in-browser live run. Shared by the worker and the data script,
// so the static (reduced-motion) curve is exactly the one the browser would draw.
export const LIVE_RUN = { hidden: 16, lr: 0.001, batch: 32, seed: 7, epochs: 100 } as const;
