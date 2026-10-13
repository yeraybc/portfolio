export interface MetricLike {
  baseline: number;
  value: number;
  lower_is_better?: boolean;
  target?: number;
  reported_pct?: number;
  approx_baseline?: boolean;
}

export type Direction = 'better' | 'worse' | 'same';

/** Signed relative change in percent, (value − baseline) / |baseline|. */
export function deltaPct(m: MetricLike): number | null {
  if (m.reported_pct !== undefined) return m.reported_pct;
  if (m.baseline === 0) return null;
  return ((m.value - m.baseline) / Math.abs(m.baseline)) * 100;
}

/** Whether the run improved on its baseline. With a target, closeness to the target decides. */
export function direction(m: MetricLike): Direction {
  if (m.target !== undefined) {
    const before = Math.abs(m.baseline - m.target);
    const after = Math.abs(m.value - m.target);
    return after < before ? 'better' : after > before ? 'worse' : 'same';
  }
  if (m.value === m.baseline) return 'same';
  const lower = m.value < m.baseline;
  return lower === Boolean(m.lower_is_better) ? 'better' : 'worse';
}

/** Whether the relative change should be shown (it is meaningless for target metrics or sign flips). */
export function showPct(m: MetricLike): boolean {
  if (m.approx_baseline) return false;
  return m.target === undefined && m.baseline !== 0 && Math.sign(m.baseline) === Math.sign(m.value || m.baseline);
}
