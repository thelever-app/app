import type { DomainEvent } from './domain-event.ts';

export type LobbyChange =
  | 'player-joined'
  | 'player-expelled'
  | 'avatar-changed'
  | 'settings-changed'
  | 'dilemmas-changed'
  | 'game-started';

/** Sent to everyone in the room when something they see in the lobby changes. */
export class LobbyChangedEvent implements DomainEvent {
  readonly type = 'LobbyChanged';
  readonly roomId: string;
  readonly change: LobbyChange;
  /** The version of the room after this change, so the clients can order what they receive. */
  readonly roomVersion: number;

  constructor(roomId: string, change: LobbyChange, roomVersion: number) {
    this.roomId = roomId;
    this.change = change;
    this.roomVersion = roomVersion;
  }
}
