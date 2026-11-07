import { WORD_SIMILARITY } from '../../application/ports/dilemma-repository.port.ts';

/**
 * The search of a text as the PostgreSQL repository does it with pg_trgm and unaccent, for the
 * dilemmas kept in memory: the same rules, so the contract of the repository holds for both.
 */

/** Lower case and without accents, as unaccent and lower leave it. */
export function searchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** The trigrams of each word in order, as pg_trgm pads them: two spaces before and one after. */
function trigramsOf(text: string): string[] {
  return text
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)
    .flatMap((word) => {
      const padded = `  ${word} `;
      return Array.from({ length: padded.length - 2 }, (_, index) =>
        padded.slice(index, index + 3),
      );
    });
}

/**
 * pg_trgm's word_similarity: the greatest similarity between the trigrams of what was typed and
 * those of any stretch of the text, from 0 to 1.
 */
export function wordSimilarity(typed: string, text: string): number {
  const wanted = new Set(trigramsOf(typed));
  const sequence = trigramsOf(text);
  if (wanted.size === 0) return 0;
  let best = 0;
  for (let start = 0; start < sequence.length; start += 1) {
    const stretch = new Set<string>();
    for (let end = start; end < sequence.length; end += 1) {
      stretch.add(sequence[end]!);
      const common = [...stretch].filter((trigram) => wanted.has(trigram)).length;
      best = Math.max(best, common / (wanted.size + stretch.size - common));
    }
  }
  return best;
}

/** A word typed matches a text it is part of, or one alike enough to it. */
function matches(word: string, text: string): boolean {
  return text.includes(word) || wordSimilarity(word, text) >= WORD_SIMILARITY;
}

/**
 * How a dilemma ranks for what was typed, or undefined if it does not match: every word typed
 * must match the text or a tag. A tag equal to what was typed goes first; then, the more alike
 * what was typed is to the text or a tag, the better.
 */
export function rankOf(
  typed: string,
  dilemma: { readonly text: string; readonly tags: readonly string[] },
): { readonly wholeTag: boolean; readonly similarity: number } | undefined {
  const query = searchText(typed).trim();
  const fields = [searchText(dilemma.text), ...dilemma.tags.map(searchText)];
  const words = query.split(/\s+/).filter((word) => word.length > 0);
  if (!words.every((word) => fields.some((field) => matches(word, field)))) return undefined;
  return {
    wholeTag: fields.slice(1).includes(query),
    similarity: Math.max(...fields.map((field) => wordSimilarity(query, field))),
  };
}
