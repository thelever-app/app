import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone when the dilemma of a round is revealed. */
export class DilemmaRevealedEvent implements DomainEvent {
  readonly type = 'DilemmaRevealed';
  readonly gameId: string;
  /** The position of the round in the game, from 0. */
  readonly position: number;
  readonly gameVersion: number;

  constructor(gameId: string, position: number, gameVersion: number) {
    this.gameId = gameId;
    this.position = position;
    this.gameVersion = gameVersion;
  }
}
