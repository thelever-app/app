import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface ExpelPlayerInput {
  readonly roomId: string;
  /** The host, who expels. */
  readonly playerId: string;
  readonly expelledPlayerId: string;
}

/** The host takes a player out of the lobby; the room and the expelled player learn it. */
export class ExpelPlayerUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId, expelledPlayerId }: ExpelPlayerInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);

    room.expel(playerId, expelledPlayerId);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);

    // The expelled player is no longer in the room, but must learn they left it.
    const playerIds = [...room.players.map(({ id }) => id), expelledPlayerId];
    await Promise.allSettled(events.map((event) => this.#notifier.notify(playerIds, event)));
  }
}
