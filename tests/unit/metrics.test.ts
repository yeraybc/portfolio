import { describe, expect, it } from 'vitest';
import { deltaPct, direction, showPct } from '../../src/lib/metrics';
import { fmtNum, fmtPct, fmtBaseline } from '../../src/lib/format';

describe('metrics', () => {
  it('treats a drop as better when lower is better', () => {
    const m = { baseline: 907, value: 745, lower_is_better: true };
    expect(direction(m)).toBe('better');
    expect(deltaPct(m)).toBeCloseTo(-17.86, 2);
  });
  it('treats a rise as better by default', () => {
    expect(direction({ baseline: 0.43, value: 0.62 })).toBe('better');
    expect(direction({ baseline: 0.1995, value: 0.2104, lower_is_better: true })).toBe('worse');
  });
  it('uses the distance to the target when there is one', () => {
    const moran = { baseline: 0.21, value: -0.03, target: 0 };
    expect(direction(moran)).toBe('better');
    expect(showPct(moran)).toBe(false);
  });
  it('prefers the published percentage over the recomputed one', () => {
    expect(deltaPct({ baseline: 907, value: 745, reported_pct: -17.8 })).toBe(-17.8);
  });
  it('hides the percentage for an approximate baseline', () => {
    const m = { baseline: 60, value: 5, lower_is_better: true, approx_baseline: true };
    expect(showPct(m)).toBe(false);
    expect(fmtBaseline(m, 'en')).toBe('~60');
  });
});

describe('format', () => {
  it('formats numbers per locale with a real minus sign', () => {
    expect(fmtNum(1507, 'en')).toBe('1,507');
    expect(fmtNum(1507, 'es')).toBe('1.507');
    expect(fmtNum(-0.03, 'es', 2)).toBe('−0,03');
  });
  it('formats signed percentages', () => {
    expect(fmtPct(-17.8, 'en')).toBe('−17.8%');
    expect(fmtPct(-17.8, 'es')).toBe('−17,8 %');
    expect(fmtPct(44.2, 'en')).toBe('+44.2%');
  });
});
