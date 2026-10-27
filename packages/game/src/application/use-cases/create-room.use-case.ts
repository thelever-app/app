import { Room } from '../../domain/entities/room.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface CreateRoomInput {
  readonly hostNickname: string;
  /** Who creates the room, from their verified token. */
  readonly hostIdentity: string;
}

export interface CreateRoomOutput {
  readonly roomId: string;
  readonly hostId: string;
}

/** A player creates a room and becomes its host. */
export class CreateRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #idGenerator: IdGenerator;

  constructor(roomRepository: RoomRepository, idGenerator: IdGenerator) {
    this.#roomRepository = roomRepository;
    this.#idGenerator = idGenerator;
  }

  async execute({ hostNickname, hostIdentity }: CreateRoomInput): Promise<CreateRoomOutput> {
    const room = Room.create({ hostNickname, hostIdentity }, this.#idGenerator);

    await this.#roomRepository.save(room);

    return { roomId: room.id, hostId: room.host.id };
  }
}
