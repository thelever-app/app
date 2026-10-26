import type { DomainEvent } from './domain-event.ts';

/** Sent to the other players when a player disconnects or connects again. */
export class ConnectionChangedEvent implements DomainEvent {
  readonly type = 'ConnectionChanged';
  readonly roomId: string;
  readonly playerId: string;
  readonly connected: boolean;
  /** The version of the room after this change, so the clients can order what they receive. */
  readonly roomVersion: number;

  constructor(roomId: string, playerId: string, connected: boolean, roomVersion: number) {
    this.roomId = roomId;
    this.playerId = playerId;
    this.connected = connected;
    this.roomVersion = roomVersion;
  }
}
