import type { DomainEvent } from './domain-event.ts';

/** Sent only to the player who liked the dilemma of the reveal: nobody else sees likes. */
export class DilemmaLikedEvent implements DomainEvent {
  readonly type = 'DilemmaLiked';
  readonly gameId: string;
  readonly playerId: string;
  readonly gameVersion: number;

  constructor(gameId: string, playerId: string, gameVersion: number) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.gameVersion = gameVersion;
  }
}
