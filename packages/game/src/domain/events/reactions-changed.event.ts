import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone when a player reacts, or changes their reaction, in the reveal of a round. */
export class ReactionsChangedEvent implements DomainEvent {
  readonly type = 'ReactionsChanged';
  readonly gameId: string;
  readonly position: number;
  readonly gameVersion: number;

  constructor(gameId: string, position: number, gameVersion: number) {
    this.gameId = gameId;
    this.position = position;
    this.gameVersion = gameVersion;
  }
}
