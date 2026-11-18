import type { Category } from './category.vo.ts';
import type { CandidateDilemma } from './classification.vo.ts';

/**
 * A dilemma of the catalog, as the lobby needs it: to check that it suits the room, to warn when it
 * needs more players and to space the dilemmas the game draws around it.
 */
export interface LobbyDilemma extends CandidateDilemma {
  /** Whether an honest answer can show a player up before someone in the role the dilemma names. */
  readonly compromising: boolean;
}

/** Where the dilemma of a round comes from (glossary, «Origen del dilema»). */
export type DilemmaOrigin = 'random' | 'specific' | 'players';

export const DILEMMA_ORIGINS = ['random', 'specific', 'players'] as const;

/**
 * A round of the settings of the room, with an id of its own in the room, so a player choosing its
 * dilemma keeps it when the host adds or removes other rounds.
 */
export type RoundSnapshot =
  /** A dilemma of the catalog the system draws; null categories draw from every one. */
  | {
      readonly id: number;
      readonly origin: 'random';
      readonly categories: readonly Category[] | null;
    }
  /** The dilemma the host chose. */
  | { readonly id: number; readonly origin: 'specific'; readonly dilemma: LobbyDilemma }
  /** The dilemma a player chooses in the lobby, which the room keeps apart: who chose it is secret. */
  | { readonly id: number; readonly origin: 'players' };

/** A random round from every category, what a new room has and what a round left out goes back to. */
export function randomRound(id: number): RoundSnapshot {
  return { id, origin: 'random', categories: null };
}
