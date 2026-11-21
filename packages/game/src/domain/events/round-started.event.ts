import type { DomainEvent } from './domain-event.ts';

/**
 * Sent to everyone when the group moves on from the reveal of a round to the next one: once everyone
 * is ready, or when the host moves everyone on.
 */
export class RoundStartedEvent implements DomainEvent {
  readonly type = 'RoundStarted';
  readonly gameId: string;
  /** The position of the new round in the game, from 0. */
  readonly position: number;
  /** The host who moved everyone on; null when everyone was ready. */
  readonly movedOnBy: string | null;
  readonly gameVersion: number;

  constructor(gameId: string, position: number, movedOnBy: string | null, gameVersion: number) {
    this.gameId = gameId;
    this.position = position;
    this.movedOnBy = movedOnBy;
    this.gameVersion = gameVersion;
  }
}
