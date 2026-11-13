import type { DomainEvent } from '../../domain/events/domain-event.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface DisconnectConnectionsInput {
  readonly roomId: string;
  /** Connections of the room nobody will close, such as those of an instance of the server that died. */
  readonly connections: readonly { readonly playerId: string; readonly connectionId: string }[];
  /** When they closed: for an instance that died, when it was last seen alive. */
  readonly at: Date;
}

/**
 * Closes some connections of a room at once; whoever is left without any open is seen disconnected
 * by the other players of the room.
 */
export class DisconnectConnectionsUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, connections, at }: DisconnectConnectionsInput): Promise<void> {
    const room = await this.#roomRepository.findById(roomId);
    if (!room) throw new RoomNotFoundError(roomId);

    const notifications: { readonly playerIds: readonly string[]; readonly event: DomainEvent }[] =
      [];
    for (const { playerId, connectionId } of connections) {
      room.disconnect(playerId, connectionId, at);
      const otherPlayerIds = room.players.map(({ id }) => id).filter((id) => id !== playerId);
      for (const event of room.pullEvents()) {
        notifications.push({ playerIds: otherPlayerIds, event });
      }
    }
    await this.#roomRepository.save(room);

    // The connections are already closed: a player who cannot be reached must not undo it.
    await Promise.allSettled(
      notifications.map(({ playerIds, event }) => this.#notifier.notify(playerIds, event)),
    );
  }
}
