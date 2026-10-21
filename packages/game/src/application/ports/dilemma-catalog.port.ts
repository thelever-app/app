import type { GameDilemma } from '../../domain/entities/game.ts';

/** What a player reads of a dilemma: its text and its options, in one language. */
export interface DilemmaContent {
  readonly dilemmaId: string;
  readonly text: string;
  readonly options: readonly { readonly optionId: string; readonly text: string }[];
}

/**
 * How the Game context asks the Dilemmas context for the dilemmas of a game.
 * Both methods keep the order asked for and throw DilemmaNotFoundError if a dilemma does not exist.
 */
export interface DilemmaCatalog {
  /** The structure the rules of the game need: the ids of the options of each dilemma. */
  findOptionIds(dilemmaIds: readonly string[]): Promise<readonly GameDilemma[]>;
  /** The content, in the language asked for or in the original one while there is no translation. */
  findContents(dilemmaIds: readonly string[], language: string): Promise<readonly DilemmaContent[]>;
}
