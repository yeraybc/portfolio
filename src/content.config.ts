import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const l = z.object({ en: z.string().min(1), es: z.string().min(1) }).strict();
export const lensEnum = z.enum(['ds', 'quant', 'ai', 'de']);
export const statusEnum = z.enum(['production', 'running', 'pilot', 'research', 'archived', 'training']);

const metric = z.object({
  name: l,
  unit: z.string().optional(),
  baseline: z.number(),
  value: z.number(),
  lower_is_better: z.boolean().default(false),
  target: z.number().optional(),
  significance: z.string().optional(),
  decimals: z.number().int().min(0).max(4).optional(),
  /** Relative change as published in the source (computed from unrounded values). */
  reported_pct: z.number().optional(),
  /** The baseline is an estimate ("about an hour"): show "~" and no percentage. */
  approx_baseline: z.boolean().default(false),
});

const runs = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/runs' }),
  schema: z.object({
    title: l,
    status: statusEnum,
    lenses: z.array(lensEnum),
    lens_rank: z.record(lensEnum, z.number()).default({}),
    year: z.string(),
    featured: z.boolean().default(false),
    hidden: z.boolean().default(false),
    stack: z.array(z.string()),
    summary: l,
    problem: l,
    finding: l.optional(),
    business: l.optional(),
    baseline_label: l.optional(),
    headline_metric: metric.optional(),
    headline_text: l.optional(),
    metrics: z.array(metric).default([]),
    engineering: z.array(z.object({ label: l, value: z.string() })).default([]),
    sealed: z.object({ reason: l }).optional(),
    phase: z.object({ current: z.number(), total: z.number(), label: l }).optional(),
    leaderboard: z
      .object({
        title: l,
        metric: z.string(),
        baseline: z.string(),
        rows: z.array(z.object({ model: z.string(), value: z.number(), delta_pct: z.number().optional(), sig: z.string(), in_mcs: z.boolean().optional() })),
        note: l,
      })
      .optional(),
    comparison: z
      .object({ title: l, rows: z.array(z.object({ label: l, value: z.number() })), note: l })
      .optional(),
    config: z.record(z.string(), z.any()),
    decisions: z.array(z.object({ title: l, body: l })).default([]),
    notes: z.array(l).default([]),
    artifacts: z
      .object({ repo: z.string().url().optional(), app: z.string().url().optional(), paper: z.string().url().optional(), linkedin: z.string().url().optional() })
      .default({}),
    generated_deployment: z.string().optional(),
  }),
});

const deployments = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/deployments' }),
  schema: z.object({
    org: z.string(),
    role: l,
    live: z.boolean(),
    start: z.string(),
    end: z.string().optional(),
    period: l,
    location: l,
    order: z.number(),
    lenses: z.array(lensEnum),
    lens_rank: z.record(lensEnum, z.number()).default({}),
    context: l,
    highlights: z.array(l),
    stack: z.array(z.string()),
    related_runs: z.array(z.string()).default([]),
  }),
});

export const collections = { runs, deployments };
