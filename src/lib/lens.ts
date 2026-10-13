export type Lens = 'ds' | 'quant' | 'ai' | 'de';
export const LENSES: Lens[] = ['ds', 'quant', 'ai', 'de'];
export const DEFAULT_LENS: Lens = 'ds';

export function parseLens(value: string | null | undefined): Lens | null {
  return LENSES.includes(value as Lens) ? (value as Lens) : null;
}

/** Sorts items by their rank under a lens; unranked items go last, ties keep input order. */
export function sortByLens<T extends { lens_rank?: Partial<Record<Lens, number>> }>(items: T[], lens: Lens): T[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (a.item.lens_rank?.[lens] ?? 1e9) - (b.item.lens_rank?.[lens] ?? 1e9) || a.i - b.i)
    .map(({ item }) => item);
}
