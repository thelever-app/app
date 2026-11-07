import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone in the room when a player leaves the game on purpose, or comes back to it. */
export class PlayerLeftEvent implements DomainEvent {
  readonly type = 'PlayerLeft';
  readonly roomId: string;
  readonly playerId: string;
  /** False when the player who had left joins the room again. */
  readonly left: boolean;
  readonly roomVersion: number;

  constructor(roomId: string, playerId: string, left: boolean, roomVersion: number) {
    this.roomId = roomId;
    this.playerId = playerId;
    this.left = left;
    this.roomVersion = roomVersion;
  }
}
