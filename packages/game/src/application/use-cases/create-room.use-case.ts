import { Room } from '../../domain/entities/room.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import { RoomCodeVO } from '../../domain/vos/room-code.vo.ts';
import { RoomCodeUnavailableError } from '../errors/room-code-unavailable.error.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

/** With over 28 million codes, ten taken in a row means something is wrong, not bad luck. */
const CODE_ATTEMPTS = 10;

export interface CreateRoomInput {
  readonly hostNickname: string;
  /** Who creates the room, from their verified token. */
  readonly hostIdentity: string;
  readonly groupNature: string;
  readonly place: string;
  /** The language of the device of the host. */
  readonly dilemmaLanguage: string;
}

export interface CreateRoomOutput {
  readonly roomId: string;
  readonly code: string;
  readonly hostId: string;
}

/** A player creates a room, with a code no other open room has, and becomes its host. */
export class CreateRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #idGenerator: IdGenerator;
  readonly #randomness: Randomness;

  constructor(roomRepository: RoomRepository, idGenerator: IdGenerator, randomness: Randomness) {
    this.#roomRepository = roomRepository;
    this.#idGenerator = idGenerator;
    this.#randomness = randomness;
  }

  async execute(input: CreateRoomInput): Promise<CreateRoomOutput> {
    const code = await this.#freeCode();
    const room = Room.create({ ...input, code }, this.#idGenerator, this.#randomness);

    await this.#roomRepository.save(room);

    return { roomId: room.id, code: room.code, hostId: room.host.id };
  }

  async #freeCode(): Promise<string> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = RoomCodeVO.generate(this.#randomness).value;
      if (!(await this.#roomRepository.findByCode(code))) return code;
    }
    throw new RoomCodeUnavailableError();
  }
}
