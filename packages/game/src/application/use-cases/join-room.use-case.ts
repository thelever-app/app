import { Player } from '../../domain/entities/player.ts';
import { RoomNotFoundError } from '../errors/room-not-found.error.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface JoinRoomInput {
  readonly roomId: string;
  readonly nickname: string;
  /** Who joins, from their verified token. */
  readonly identity: string;
}

export interface JoinRoomOutput {
  readonly playerId: string;
}

/** A new player joins an existing room; whoever is already in it gets their player back. */
export class JoinRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #idGenerator: IdGenerator;

  constructor(roomRepository: RoomRepository, idGenerator: IdGenerator) {
    this.#roomRepository = roomRepository;
    this.#idGenerator = idGenerator;
  }

  async execute({ roomId, nickname, identity }: JoinRoomInput): Promise<JoinRoomOutput> {
    const room = await this.#roomRepository.findById(roomId);
    if (!room) throw new RoomNotFoundError(roomId);

    const existing = room.playerWith(identity);
    if (existing) return { playerId: existing.id };

    const player = Player.create({ nickname, identity }, this.#idGenerator);
    room.addPlayer(player);
    await this.#roomRepository.save(room);

    return { playerId: player.id };
  }
}
