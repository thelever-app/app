import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone in the room when the role of host passes to another player, or comes back. */
export class HostChangedEvent implements DomainEvent {
  readonly type = 'HostChanged';
  readonly roomId: string;
  readonly hostId: string;
  readonly roomVersion: number;

  constructor(roomId: string, hostId: string, roomVersion: number) {
    this.roomId = roomId;
    this.hostId = hostId;
    this.roomVersion = roomVersion;
  }
}
