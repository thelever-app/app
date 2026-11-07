/** The categories of the catalog, in the order the screens offer them (glossary of Dilemmas). */
export const CATEGORIES = [
  'life-and-death',
  'honesty',
  'loyalty',
  'justice',
  'love-and-relationships',
  'work-and-money',
  'technology-and-the-future',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** A category the screens know how to name; any other one comes from a newer catalog. */
export function isCategory(category: string): category is Category {
  return (CATEGORIES as readonly string[]).includes(category);
}
