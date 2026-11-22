import type { DilemmaStatus } from '../../domain/entities/dilemma.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import type { DilemmaType } from '../../domain/vos/dilemma-type.vo.ts';
import type { MinimumAge } from '../../domain/vos/minimum-age.vo.ts';
import type { Scale } from '../../domain/vos/scale.vo.ts';

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
  /** Whether the compromising dilemmas are found too: no room plays them unless it includes them. */
  readonly includeCompromising: boolean;
}

/**
 * What a draw asks of the dilemmas it finds: their minimum age, any, 16 or 18, and whether they are
 * compromising, any, no or yes.
 */
export interface CandidateContent {
  readonly age: 'any' | 'from-16' | 'adults-only';
  readonly compromising: 'any' | 'no' | 'yes';
}

/** The criteria a game is put together with: no text, no ids, and how many it draws. */
export interface CandidateCriteria extends Omit<DilemmaCriteria, 'text' | 'dilemmaIds'> {
  /** At most how many are drawn. */
  readonly count: number;
  /** Whether those with the gap are drawn too: only for a room with the players it needs. */
  readonly includeGap: boolean;
  /** Never drawn: the dilemmas the game already plays. */
  readonly excludedIds: readonly string[];
  /** What the dilemmas drawn must be besides: of an age, compromising or not, or anything. */
  readonly content: CandidateContent;
  /**
   * How many players of the room played each dilemma: those played by fewer are drawn first, and
   * one nobody played before any.
   */
  readonly playedBy: readonly PlayedBy[];
}

/** How many players of a room played a dilemma. */
export interface PlayedBy {
  readonly dilemmaId: string;
  readonly players: number;
}

/** What a list of dilemmas shows of each one, at its current version: never its options or its arguments. */
export interface DilemmaSummary {
  readonly id: string;
  readonly version: number;
  readonly text: string;
  readonly minimumAge: MinimumAge;
  readonly category: Category;
  readonly tags: readonly string[];
  readonly optionCount: number;
  /** Whether an honest answer can show a player up before someone in the role the dilemma names. */
  readonly compromising: boolean;
  readonly type: DilemmaType;
  readonly scale: Scale;
  /** Whether its text or any of its options has the gap "someone in the group". */
  readonly hasGap: boolean;
}

/** What a game is put together with of a dilemma, at its current version: its id and its classification. */
export interface DilemmaCandidate {
  readonly id: string;
  readonly type: DilemmaType;
  readonly scale: Scale;
  readonly minimumAge: MinimumAge;
  /** Whether its text or any of its options has the gap "someone in the group". */
  readonly hasGap: boolean;
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
  /**
   * At most `count` of the public dilemmas that match, drawn at random, those played by fewer
   * players of the room before the others: a game draws from them.
   */
  candidatesOf(criteria: CandidateCriteria): Promise<DilemmaCandidate[]>;
  /**
   * A page of the public dilemmas that match: with a text, the best matches first and then by id;
   * without one, by id. A page starts right after where the page before ended in that order, even
   * if that dilemma has gone since. A `next` that is not where a page ends, or that ended a search
   * with a text when this one has none or the other way round, throws InvalidPageError.
   */
  search(criteria: DilemmaCriteria, page: PageRequest): Promise<DilemmaPage>;
}
