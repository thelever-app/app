import type { GameDilemma } from '../../domain/entities/game.ts';

/** What a player reads of a dilemma: its text and its options, in one language. */
export interface DilemmaContent {
  readonly dilemmaId: string;
  readonly text: string;
  readonly options: readonly { readonly optionId: string; readonly text: string }[];
}

/** A dilemma of the catalog as the lobby shows it, in the language asked for. */
export interface CatalogDilemma {
  readonly dilemmaId: string;
  readonly text: string;
  readonly minimumAge: 16 | 18;
  readonly category: string;
  readonly tags: readonly string[];
}

/** Which dilemmas to look for; every criterion given must hold. */
export interface DilemmaSearch {
  readonly dilemmaIds?: readonly string[];
  /** Any of them; none, every category. */
  readonly categories?: readonly string[];
  /** What a player typed, looked for in the text and the tags; the best matches may come first. */
  readonly text?: string;
  /** 16 leaves out the dilemmas for adults. */
  readonly maximumMinimumAge: 16 | 18;
  /** In the general catalog, or in exploration before it gets there. */
  readonly status: 'in-catalog' | 'in-exploration';
  readonly language: string;
}

/**
 * How the Game context asks the Dilemmas context for the dilemmas of a game.
 * Both methods keep the order asked for and throw DilemmaNotFoundError if a dilemma, or that version of it, does not exist.
 */
export interface DilemmaCatalog {
  /** The structure the rules of the game need: the current version of each dilemma and the ids of its options. */
  findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]>;
  /**
   * The content of the versions played, in the language asked for or in the original one while there is
   * no translation; a game shows what it plays even if a dilemma gets a new version meanwhile.
   */
  findContents(
    dilemmas: readonly { readonly dilemmaId: string; readonly version: number }[],
    language: string,
  ): Promise<readonly DilemmaContent[]>;
  /** The public dilemmas that match, at their current version; none is an empty list. */
  search(criteria: DilemmaSearch): Promise<readonly CatalogDilemma[]>;
}
