import { describe, expect, it } from 'vitest';
import { parseLens, sortByLens } from '../../src/lib/lens';
import { readdirSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { localizeConfig, toYamlLines } from '../../src/lib/yaml';
import { toolGroups } from '../../src/data/profile';
import { localePath, stripLocale } from '../../src/i18n/utils';
import { ui } from '../../src/i18n/ui';

describe('lens', () => {
  it('parses only known lenses', () => {
    expect(parseLens('quant')).toBe('quant');
    expect(parseLens('nope')).toBeNull();
    expect(parseLens(null)).toBeNull();
  });
  it('sorts by rank and keeps unranked items last', () => {
    const items = [
      { id: 'a', lens_rank: { quant: 3 } },
      { id: 'b', lens_rank: { quant: 1 } },
      { id: 'c', lens_rank: {} },
    ];
    expect(sortByLens(items, 'quant').map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('yaml printer', () => {
  it('prints nested objects and flat lists', () => {
    const text = toYamlLines({ a: 1, b: { c: ['x', 'y'] }, d: 'k: v' })
      .map((l) => l.map((t) => t.text).join(''))
      .join('\n');
    expect(text).toBe('a: 1\nb:\n  c: [x, y]\nd: "k: v"');
  });
});

type RunYaml = { status: string; hidden?: boolean; stack: string[]; config: Record<string, unknown> };
const runs = readdirSync('src/content/runs').map((f) => ({ id: f.replace(/\.yaml$/, ''), ...(yaml.load(readFileSync(`src/content/runs/${f}`, 'utf8')) as RunYaml) }));
const hasLocalized = (v: unknown): boolean =>
  !!v && typeof v === 'object' && (Object.keys(v).sort().join() === 'en,es' || Object.values(v).some(hasLocalized));

describe('localized config', () => {
  it('resolves {en, es} leaves inside lists and nested maps', () => {
    const cfg = { a: { en: 'x', es: 'y' }, b: ['k', { en: 'p', es: 'q' }], c: { d: { en: 'm', es: 'n' }, n: 3 } };
    expect(localizeConfig(cfg, 'es')).toEqual({ a: 'y', b: ['k', 'q'], c: { d: 'n', n: 3 } });
  });
  it.each(runs.map((r) => r.id))('%s: every {en, es} pair is well formed and none reaches the page', (id) => {
    const run = runs.find((r) => r.id === id)!;
    // A comma in an unquoted flow value splits it into extra keys: {en: a, b, es: c} has keys en, b, es.
    const malformed: unknown[] = [];
    const walk = (v: unknown) => {
      if (!v || typeof v !== 'object') return;
      const keys = Object.keys(v);
      if ((keys.includes('en') || keys.includes('es')) && (keys.sort().join() !== 'en,es' || Object.values(v).some((x) => typeof x !== 'string'))) malformed.push(v);
      Object.values(v).forEach(walk);
    };
    walk(run.config);
    expect(malformed).toEqual([]);
    for (const locale of ['en', 'es'] as const) expect(hasLocalized(localizeConfig(run.config, locale))).toBe(false);
  });
});

describe('tool groups', () => {
  it('put every tool of a listed project in exactly one group', () => {
    const tools = new Set(runs.filter((r) => !r.hidden && r.status !== 'archived').flatMap((r) => r.stack));
    for (const tool of tools) expect([tool, toolGroups.filter((g) => g.tools.includes(tool)).length]).toEqual([tool, 1]);
  });
});

describe('i18n', () => {
  it('builds and strips locale paths', () => {
    expect(localePath('/', 'en')).toBe('/');
    expect(localePath('/', 'es')).toBe('/es');
    expect(localePath('/projects/home-credit', 'es')).toBe('/es/projects/home-credit');
    expect(stripLocale('/es/projects')).toBe('/projects');
    expect(stripLocale('/es')).toBe('/');
  });
  it('has the same keys in every language', () => {
    expect(Object.keys(ui.es).sort()).toEqual(Object.keys(ui.en).sort());
  });
});
