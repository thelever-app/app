import type { DomainEvent } from './domain-event.ts';

/** Sent only to the player who took back their like to the dilemma of the reveal. */
export class DilemmaUnlikedEvent implements DomainEvent {
  readonly type = 'DilemmaUnliked';
  readonly gameId: string;
  readonly playerId: string;
  readonly gameVersion: number;

  constructor(gameId: string, playerId: string, gameVersion: number) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.gameVersion = gameVersion;
  }
}
