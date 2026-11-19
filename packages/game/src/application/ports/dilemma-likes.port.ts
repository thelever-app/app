import type { Seal } from '../../domain/vos/answer.vo.ts';

/** What a like given in the reveal of a game weighs; one given from the catalog weighs less. */
export const GAME_LIKE_WEIGHT = 1;

/** «Buen dilema» given by a player to a dilemma, with the seal in force when they gave it. */
export interface DilemmaLike {
  /** Who gave it: a like belongs to the identity, not to the room, which is deleted. */
  readonly identity: string;
  readonly dilemmaId: string;
  readonly seal: Seal;
  readonly at: Date;
}

/**
 * How the Game context keeps the likes its players give, one per identity and dilemma in all,
 * apart from the room so they outlive it. Dilemmas reads them for the rating.
 */
export interface DilemmaLikes {
  /** Keeps it once; a like the identity gave to that dilemma from the catalog weighs as one of a game. */
  like(like: DilemmaLike): Promise<void>;
  /** Takes back the like the identity gave to that dilemma, wherever it gave it; none, nothing. */
  unlike(identity: string, dilemmaId: string): Promise<void>;
  hasLiked(identity: string, dilemmaId: string): Promise<boolean>;
}
