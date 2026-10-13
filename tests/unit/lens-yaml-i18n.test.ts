import { describe, expect, it } from 'vitest';
import { parseLens, sortByLens } from '../../src/lib/lens';
import { toYamlLines } from '../../src/lib/yaml';
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

describe('i18n', () => {
  it('builds and strips locale paths', () => {
    expect(localePath('/', 'en')).toBe('/');
    expect(localePath('/', 'es')).toBe('/es');
    expect(localePath('/runs/home-credit', 'es')).toBe('/es/runs/home-credit');
    expect(stripLocale('/es/runs')).toBe('/runs');
    expect(stripLocale('/es')).toBe('/');
  });
  it('has the same keys in every language', () => {
    expect(Object.keys(ui.es).sort()).toEqual(Object.keys(ui.en).sort());
  });
});
