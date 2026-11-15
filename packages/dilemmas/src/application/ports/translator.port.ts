import type { CuratedArguments } from './curated-catalog.port.ts';

/** What the translator gets and gives of a version of a dilemma, option n translating option n. */
export interface TranslatableContent {
  readonly name: string;
  readonly text: string;
  readonly options: readonly string[];
  readonly tags: readonly string[];
  readonly arguments?: CuratedArguments;
}

/**
 * Translates the content of a version of a dilemma. The gap "someone in the group" stays as it is
 * in every language, and every language has as many options as the original, in the same order.
 */
export interface Translator {
  /** The content in each language asked for, keyed by it. */
  translate(
    content: TranslatableContent,
    from: string,
    to: readonly string[],
  ): Promise<ReadonlyMap<string, TranslatableContent>>;
}
