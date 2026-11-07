import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface DisconnectPlayerInput {
  readonly roomId: string;
  readonly playerId: string;
  /** The connection that closed, as ConnectPlayerUseCase returned it. */
  readonly connectionId: string;
}

/** A connection of a player closes; if it was the last one they had open, the others see them disconnected. */
export class DisconnectPlayerUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId, connectionId }: DisconnectPlayerInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);

    // Saved even without an event: a connection that closes while another one stays open must not come back.
    room.disconnect(playerId, connectionId);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);

    const otherPlayerIds = room.players.map(({ id }) => id).filter((id) => id !== playerId);
    await Promise.allSettled(events.map((event) => this.#notifier.notify(otherPlayerIds, event)));
  }
}
