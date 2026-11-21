import type { DomainEvent } from './domain-event.ts';

/**
 * Sent to everyone when a player is ready to move on from the reveal of a round or from a screen of
 * the game results, and the group is still waiting for others.
 */
export class ReadyToMoveOnChangedEvent implements DomainEvent {
  readonly type = 'ReadyToMoveOnChanged';
  readonly gameId: string;
  readonly gameVersion: number;

  constructor(gameId: string, gameVersion: number) {
    this.gameId = gameId;
    this.gameVersion = gameVersion;
  }
}
