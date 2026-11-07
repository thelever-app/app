import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import { IdentityNotInRoomError } from '../errors/identity-not-in-room.error.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface ConnectPlayerInput {
  readonly roomId: string;
  /** Who connects, from their verified token; never a player id the client sends. */
  readonly identity: string;
}

export interface ConnectPlayerOutput {
  /** The player of the room behind that identity. */
  readonly playerId: string;
  /** Identifies this connection, to tell its close apart from the close of the others of the player. */
  readonly connectionId: string;
}

/** A player opens a connection to their room, in the lobby or in a game; the others see them connected. */
export class ConnectPlayerUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;
  readonly #idGenerator: IdGenerator;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier, idGenerator: IdGenerator) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
    this.#idGenerator = idGenerator;
  }

  async execute({ roomId, identity }: ConnectPlayerInput): Promise<ConnectPlayerOutput> {
    const room = await findRoom(this.#roomRepository, roomId);
    const playerId = room.playerWith(identity)?.id;
    if (!playerId) throw new IdentityNotInRoomError(roomId);

    const connectionId = this.#idGenerator.generate();
    room.connect(playerId, connectionId);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);

    // The connection is already saved: a player who cannot be reached must not undo it.
    const otherPlayerIds = room.players.map(({ id }) => id).filter((id) => id !== playerId);
    await Promise.allSettled(events.map((event) => this.#notifier.notify(otherPlayerIds, event)));

    return { playerId, connectionId };
  }
}
