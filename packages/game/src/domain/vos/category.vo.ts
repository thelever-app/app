/**
 * The categories a room plays, from the closed list of the glossary: the ids Dilemmas gives its
 * dilemmas, which Game keeps as its own so the room checks them.
 */
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

/** Whether a text is one of the categories. */
export function isCategory(text: string): text is Category {
  return (CATEGORIES as readonly string[]).includes(text);
}
