import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone in the game when a player joins it once it has started. */
export class PlayerJoinedLateEvent implements DomainEvent {
  readonly type = 'PlayerJoinedLate';
  readonly gameId: string;
  readonly playerId: string;
  readonly gameVersion: number;

  constructor(gameId: string, playerId: string, gameVersion: number) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.gameVersion = gameVersion;
  }
}
