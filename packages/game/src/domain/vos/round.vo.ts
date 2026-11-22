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
 * The minimum age a random round asks of its dilemma: any, 16 or 18. Only an adults-only room asks
 * for one, since in any other room every dilemma is from 16.
 */
export const CONTENT_AGES = ['any', 'from-16', 'adults-only'] as const;

export type ContentAge = (typeof CONTENT_AGES)[number];

/** Whether a random round asks for a compromising dilemma: only where they are on. */
export const CONTENT_COMPROMISING = ['any', 'no', 'yes'] as const;

export type ContentCompromising = (typeof CONTENT_COMPROMISING)[number];

/**
 * What the dilemma of a random round must be besides its categories (glossary, «Contenido de la
 * ronda»), in the two ways the room tells dilemmas apart.
 */
export interface RoundContent {
  readonly age: ContentAge;
  readonly compromising: ContentCompromising;
}

/** Any content: any age and compromising or not. */
export const ANY_CONTENT: RoundContent = { age: 'any', compromising: 'any' };

export function isAnyContent({ age, compromising }: RoundContent): boolean {
  return age === 'any' && compromising === 'any';
}

/** Whether a dilemma of that minimum age, compromising or not, is of the content. */
export function isOfContent(
  dilemma: { readonly minimumAge: number; readonly compromising: boolean },
  { age, compromising }: RoundContent,
): boolean {
  return (
    (age === 'any' || dilemma.minimumAge === (age === 'adults-only' ? 18 : 16)) &&
    (compromising === 'any' || dilemma.compromising === (compromising === 'yes'))
  );
}

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
      readonly content: RoundContent;
    }
  /** The dilemma the host chose. */
  | { readonly id: number; readonly origin: 'specific'; readonly dilemma: LobbyDilemma }
  /** The dilemma a player chooses in the lobby, which the room keeps apart: who chose it is secret. */
  | { readonly id: number; readonly origin: 'players' };

/**
 * A random round from every category, of any content unless given another: what a round left out
 * goes back to.
 */
export function randomRound(id: number, content: RoundContent = ANY_CONTENT): RoundSnapshot {
  return { id, origin: 'random', categories: null, content };
}
