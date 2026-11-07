import {
  ConnectionChangedEvent,
  LobbyChangedEvent,
  ProgressUpdatedEvent,
  type DomainEvent,
  type PlayerNotifier,
} from '@thelever-app/game';
import { ServerMessageDto } from '@thelever-app/protocol';
import type { RoomConnection, Session } from './room-connection.ts';
import type { StateSender } from './state-sender.ts';

/** The message a player receives for each event, or undefined if the event never leaves the server as is. */
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
 * Delivers the events of the use cases to the connections of each player in this instance. A change
 * of the lobby reaches each player as the state they may see after it, which differs per player.
 */
export class SocketNotifier implements PlayerNotifier {
  readonly #connections = new Map<string, Set<RoomConnection>>();
  readonly #stateSender: Pick<StateSender, 'send'>;

  constructor(stateSender: Pick<StateSender, 'send'>) {
    this.#stateSender = stateSender;
  }

  register(playerId: string, connection: RoomConnection): void {
    const connections = this.#connections.get(playerId) ?? new Set();
    connections.add(connection);
    this.#connections.set(playerId, connections);
  }

  unregister(playerId: string, connection: RoomConnection): void {
    const connections = this.#connections.get(playerId);
    connections?.delete(connection);
    if (connections?.size === 0) this.#connections.delete(playerId);
  }

  async notify(playerIds: readonly string[], event: DomainEvent): Promise<void> {
    if (event instanceof LobbyChangedEvent) {
      await this.#sendStates(playerIds);
      return;
    }
    const message = messageFor(event);
    if (!message) return;
    const data = JSON.stringify(ServerMessageDto.parse(message));
    for (const playerId of playerIds) {
      for (const { socket } of this.#connections.get(playerId) ?? []) socket.send(data);
    }
  }

  /**
   * Sends the player of the connection what they may see now. One who is no longer in the room
   * stops receiving for it and their connection closes, without disconnecting anyone: expelling
   * already closed the connections of the player in the room.
   */
  async sendState(connection: RoomConnection, session: Session): Promise<void> {
    const delivered = await this.#stateSender.send(connection, session);
    if (delivered === 'sent') return;
    this.unregister(session.playerId, connection);
    connection.socket.close(1000, 'expelled');
  }

  async #sendStates(playerIds: readonly string[]): Promise<void> {
    const sends = playerIds.flatMap((playerId) =>
      [...(this.#connections.get(playerId) ?? [])].map(async (connection) => {
        const { session } = connection;
        if (session) await this.sendState(connection, session);
      }),
    );
    await Promise.all(sends);
  }
}
