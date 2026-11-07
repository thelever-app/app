/** How well a dilemma matches what a player searched: the lower, the better. */
const WHOLE_TAG = 0;
const START_OF_A_WORD = 1;
const ANYWHERE = 2;

/** Lower case and without accents, so «Tranvía» and «tranvia» read the same. */
function normalized(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Whether a dilemma, by its text and its tags, matches what a player typed, and how well: every
 * word typed must be part of a word of the text or of a tag. A whole tag ranks first, then the
 * start of a word, then anywhere else. Nothing typed matches every dilemma.
 */
export function relevanceOf(
  query: string,
  dilemma: { readonly text: string; readonly tags: readonly string[] },
): number | undefined {
  const typed = normalized(query).trim();
  if (typed === '') return ANYWHERE;
  const tags = dilemma.tags.map(normalized);
  const words = [...normalized(dilemma.text).split(/[^\p{L}\p{N}]+/u), ...tags];
  const searchable = [normalized(dilemma.text), ...tags].join(' ');

  if (!typed.split(/\s+/).every((word) => searchable.includes(word))) return undefined;
  if (tags.includes(typed)) return WHOLE_TAG;
  if (words.some((word) => word.startsWith(typed))) return START_OF_A_WORD;
  return ANYWHERE;
}
