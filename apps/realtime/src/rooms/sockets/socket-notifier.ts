import {
  ConnectionChangedEvent,
  ProgressUpdatedEvent,
  type DomainEvent,
  type PlayerNotifier,
} from '@thelever-app/game';
import { ServerMessageDto } from '@thelever-app/protocol';
import type { WebSocket } from 'ws';

/** The message a player receives for each event, or undefined if the event never leaves the server. */
function messageFor(event: DomainEvent): ServerMessageDto | undefined {
  if (event instanceof ProgressUpdatedEvent) {
    return {
      type: 'progress-updated',
      gameVersion: event.gameVersion,
      playerId: event.playerId,
      progress: event.progress,
    };
  }
  if (event instanceof ConnectionChangedEvent) {
    return {
      type: 'connection-changed',
      roomVersion: event.roomVersion,
      playerId: event.playerId,
      connected: event.connected,
    };
  }
  return undefined;
}

/**
 * Delivers the events of the use cases to the sockets of each player in this instance.
 */
export class SocketNotifier implements PlayerNotifier {
  readonly #sockets = new Map<string, Set<WebSocket>>();

  register(playerId: string, socket: WebSocket): void {
    const sockets = this.#sockets.get(playerId) ?? new Set();
    sockets.add(socket);
    this.#sockets.set(playerId, sockets);
  }

  unregister(playerId: string, socket: WebSocket): void {
    const sockets = this.#sockets.get(playerId);
    sockets?.delete(socket);
    if (sockets?.size === 0) this.#sockets.delete(playerId);
  }

  async notify(playerId: string, event: DomainEvent): Promise<void> {
    const message = messageFor(event);
    if (!message) return;
    const data = JSON.stringify(ServerMessageDto.parse(message));
    for (const socket of this.#sockets.get(playerId) ?? []) socket.send(data);
  }
}
