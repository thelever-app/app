import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface JoinRoomInput {
  readonly roomId: string;
  readonly nickname: string;
  /** Who joins, from their verified token. */
  readonly identity: string;
}

export interface JoinRoomOutput {
  readonly playerId: string;
}

/** A new player joins a room with a free avatar; whoever is already in it gets their player back. */
export class JoinRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;
  readonly #idGenerator: IdGenerator;
  readonly #randomness: Randomness;

  constructor(
    roomRepository: RoomRepository,
    notifier: PlayerNotifier,
    idGenerator: IdGenerator,
    randomness: Randomness,
  ) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
    this.#idGenerator = idGenerator;
    this.#randomness = randomness;
  }

  async execute({ roomId, nickname, identity }: JoinRoomInput): Promise<JoinRoomOutput> {
    const room = await findRoom(this.#roomRepository, roomId);

    const player = room.join({ nickname, identity }, this.#idGenerator, this.#randomness);
    const events = room.pullEvents();
    if (events.length > 0) await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);

    return { playerId: player.id };
  }
}
