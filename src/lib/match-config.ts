/**
 * Knobs of the /match scorer. The "How it scores" panel reads them from here, so the page and
 * the model can never disagree.
 */

/**
 * Paste-an-offer input. Set to false to fall back to the guided form only: the requirement
 * picker, the examples and the scoring keep working without it.
 */
export const MATCH_PASTE_ENABLED = true;

/** Credit a requirement gets for each level of evidence. */
export const LEVEL_CREDIT = { proven: 1, used: 0.8, learning: 0.4, gap: 0 } as const;

/** Weight of a requirement in the coverage average. */
export const PRIORITY_WEIGHT = { must: 2, nice: 1 } as const;

/** z = SLOPE · (coverage − CENTER) + role + interest + seniority + start */
export const COVERAGE_SLOPE = 5;
export const COVERAGE_CENTER = 0.65;
/** Role term: ROLE_SLOPE · (fit − ROLE_CENTER). */
export const ROLE_SLOPE = 1.5;
export const ROLE_CENTER = 0.7;

/** Interest prior, in logit units. Bounded so it can tilt a verdict, never make one. */
export const SECTOR_PRIOR = { core: 0.6, interested: 0.3, neutral: 0 } as const;
export const ROLE_PRIOR = { core: 0.3, interested: 0.15, neutral: 0 } as const;
export const MAX_PRIOR = 0.9;

export const SENIORITY_TERM = { intern: 0, junior: 0, mid: -0.8, senior: -2 } as const;
/** An offer that needs someone before February 2027. */
export const START_ASAP_TERM = -0.5;

/** Lower bounds of each band on the score, from best to worst. */
export const BAND_THRESHOLDS = { strong: 0.75, nuanced: 0.55, partial: 0.35 } as const;

/** A clear fit ("strong") needs at least this share of must-have credit. */
export const MUST_COVERAGE_STRONG = 0.85;
/** Below this share of must-have credit, the verdict can be at best "partial". */
export const MUST_COVERAGE_FLOOR = 0.4;
