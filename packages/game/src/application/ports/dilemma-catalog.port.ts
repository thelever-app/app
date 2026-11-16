import type { GameDilemma } from '../../domain/entities/game.ts';
import type { Category } from '../../domain/vos/category.vo.ts';

/**
 * Where the nickname of the person in the gap "someone in the group" goes, in the text of a dilemma
 * and of its options, in every language: Dilemmas keeps it as it is, and so does the game.
 */
export const GAP_MARKER = '{gap}';

/** What a player reads of a dilemma: its text and its options, in one language, with the gap unfilled. */
export interface DilemmaContent {
  readonly dilemmaId: string;
  readonly text: string;
  readonly options: readonly { readonly optionId: string; readonly text: string }[];
  /** The one asked for if the version played has a translation into it; if not, that of the dilemma played. */
  readonly language: string;
}

/** A dilemma of the catalog as the lobby shows it, in the language asked for. */
export interface CatalogDilemma {
  readonly dilemmaId: string;
  readonly text: string;
  readonly minimumAge: 16 | 18;
  readonly category: Category;
  readonly tags: readonly string[];
  /** How many options it has, which the lobby says next to it. */
  readonly optionCount: number;
}

/** Which dilemmas to look for; every criterion given must hold. */
export interface DilemmaSearch {
  readonly dilemmaIds?: readonly string[];
  /** Any of them; an empty list finds nothing, and without it every category is searched. */
  readonly categories?: readonly Category[];
  /** What a player typed, looked for in the text and the tags; the best matches may come first. */
  readonly text?: string;
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: 16 | 18;
  /** In the general catalog, or in exploration before it gets there. */
  readonly status: 'in-catalog' | 'in-exploration';
  /** Only the dilemmas written or translated in it: the language of the dilemmas of the room. */
  readonly language: string;
}

/** The criteria a game is put together with: no text, no ids. */
export type CandidateSearch = Omit<DilemmaSearch, 'text' | 'dilemmaIds'>;

/** Which page of a search: the first one, or the one after the `next` of the page before. */
export interface SearchPage {
  readonly size: number;
  readonly after?: string;
}

export interface CatalogPage {
  readonly dilemmas: readonly CatalogDilemma[];
  /** Where the next page starts; none when this one is the last. */
  readonly next?: string;
}

/**
 * How the Game context asks the Dilemmas context for the dilemmas of a game.
 * Both methods keep the order asked for and throw DilemmaNotFoundError if a dilemma, or that version of it, does not exist.
 */
export interface DilemmaCatalog {
  /**
   * The structure the rules of the game need: the current version of each dilemma, the ids of its
   * options and whether its text or an option has the gap.
   */
  findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]>;
  /**
   * The content of the versions played, in the language of the player if the version played has a
   * translation into it, and if not in that of the dilemma played, always with the ids of the
   * options played; a game shows what it plays even if a dilemma gets a new version meanwhile.
   */
  findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
    language: string,
  ): Promise<readonly DilemmaContent[]>;
  /** The ids of every public dilemma that matches, at its current version, for a game to draw from. */
  findCandidateIds(criteria: CandidateSearch): Promise<readonly string[]>;
  /**
   * A page of the public dilemmas that match, at their current version, the best matches of a
   * text first. A `next` that does not come from that search throws InvalidPageError.
   */
  search(criteria: DilemmaSearch, page: SearchPage): Promise<CatalogPage>;
}
