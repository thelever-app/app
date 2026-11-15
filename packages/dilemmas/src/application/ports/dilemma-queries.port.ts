import type { DilemmaStatus } from '../../domain/entities/dilemma.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';

/** How alike a word typed and part of a text or tag must be to match, as pg_trgm's word_similarity: one wrong letter still matches. */
export const WORD_SIMILARITY = 0.5;

/** Which public dilemmas to look for, at their current version; every criterion given must hold. */
export interface DilemmaCriteria {
  readonly dilemmaIds?: readonly string[];
  /** Any of them; an empty list finds nothing, and without it every category is searched. */
  readonly categories?: readonly Category[];
  /**
   * What a player typed. Every word must be part of the text or a tag, or alike enough to one
   * (one wrong letter), without minding case or accents. The dilemmas found come first by a tag
   * equal to what was typed, then by how alike it is to the text or a tag.
   */
  readonly text?: string;
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: MinimumAge;
  readonly status: DilemmaStatus;
  /** Only the dilemmas written or translated in it; without it, every language. */
  readonly language?: string;
}

/** The criteria a game is put together with: no text, no ids. */
export type CandidateCriteria = Omit<DilemmaCriteria, 'text' | 'dilemmaIds'>;

/** What a list of dilemmas shows of each one, at its current version: never its options or its arguments. */
export interface DilemmaSummary {
  readonly id: string;
  readonly version: number;
  readonly text: string;
  readonly minimumAge: MinimumAge;
  readonly category: Category;
  readonly tags: readonly string[];
  readonly optionCount: number;
}

/** Which page of a search: the first one, or the one after the `next` of the page before. */
export interface PageRequest {
  readonly after?: string;
  readonly size: number;
}

export interface DilemmaPage {
  readonly summaries: readonly DilemmaSummary[];
  /** Where the next page starts; none when this one is the last. */
  readonly next?: string;
}

/**
 * The reads of lists of dilemmas, apart from the repository: they read only what a list needs,
 * never whole dilemmas, and only as many as asked for.
 */
export interface DilemmaQueries {
  /** The ids of the public dilemmas that match, by id: all of them, since a game draws from them. */
  idsOf(criteria: CandidateCriteria): Promise<string[]>;
  /**
   * A page of the public dilemmas that match: with a text, the best matches first and then by id;
   * without one, by id. A `next` from another search, or made up, throws InvalidPageError.
   */
  search(criteria: DilemmaCriteria, page: PageRequest): Promise<DilemmaPage>;
}
