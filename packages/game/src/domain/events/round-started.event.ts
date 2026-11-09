import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone when a player moves on from the reveal of a round to the next one. */
export class RoundStartedEvent implements DomainEvent {
  readonly type = 'RoundStarted';
  readonly gameId: string;
  /** The position of the new round in the game, from 0. */
  readonly position: number;
  readonly movedOnBy: string;
  readonly gameVersion: number;

  constructor(gameId: string, position: number, movedOnBy: string, gameVersion: number) {
    this.gameId = gameId;
    this.position = position;
    this.movedOnBy = movedOnBy;
    this.gameVersion = gameVersion;
  }
}
