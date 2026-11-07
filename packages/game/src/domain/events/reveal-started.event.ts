import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone when the decision phase ends and the game moves to the reveal. */
export class RevealStartedEvent implements DomainEvent {
  readonly type = 'RevealStarted';
  readonly gameId: string;
  readonly gameVersion: number;

  constructor(gameId: string, gameVersion: number) {
    this.gameId = gameId;
    this.gameVersion = gameVersion;
  }
}
