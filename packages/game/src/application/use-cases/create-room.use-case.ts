import { Room } from '../../domain/entities/room.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import { AvatarVO } from '../../domain/vos/avatar.vo.ts';
import { RoomCodeVO } from '../../domain/vos/room-code.vo.ts';
import { RoomCodeUnavailableError } from '../errors/room-code-unavailable.error.ts';
import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findLobbyDilemmas } from './find-lobby-dilemmas.ts';

/** With over 28 million codes, ten taken in a row means something is wrong, not bad luck. */
const CODE_ATTEMPTS = 10;

export interface CreateRoomInput {
  readonly hostNickname: string;
  /** Who creates the room, from their verified token. */
  readonly hostIdentity: string;
  /** The avatar the host chose before creating the room. */
  readonly hostAvatar: { readonly face: string; readonly color: string };
  readonly groupNature: string;
  readonly place: string;
  /** The language of the device of the host or, with a first dilemma, the language of that dilemma. */
  readonly dilemmaLanguage: string;
  /** A dilemma of the general catalog in that language, which the first game plays first. */
  readonly firstDilemmaId?: string;
}

export interface CreateRoomOutput {
  readonly roomId: string;
  readonly code: string;
  readonly hostId: string;
}

/**
 * A player creates a room, with a code no other room has, and becomes its host; from the public page
 * of a dilemma, a room whose first game starts with it.
 */
export class CreateRoomUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #dilemmaCatalog: DilemmaCatalog;
  readonly #idGenerator: IdGenerator;
  readonly #randomness: Randomness;
  readonly #clock: Clock;

  constructor(
    roomRepository: RoomRepository,
    dilemmaCatalog: DilemmaCatalog,
    idGenerator: IdGenerator,
    randomness: Randomness,
    clock: Clock,
  ) {
    this.#roomRepository = roomRepository;
    this.#dilemmaCatalog = dilemmaCatalog;
    this.#idGenerator = idGenerator;
    this.#randomness = randomness;
    this.#clock = clock;
  }

  async execute({ firstDilemmaId, ...input }: CreateRoomInput): Promise<CreateRoomOutput> {
    const [firstDilemma] =
      firstDilemmaId === undefined
        ? []
        : await findLobbyDilemmas(this.#dilemmaCatalog, input.dilemmaLanguage, [firstDilemmaId]);
    const code = await this.#freeCode();
    const { face, color } = input.hostAvatar;
    const hostAvatar = new AvatarVO(face, color);
    const createdAt = this.#clock.now();
    const room = Room.create(
      { ...input, hostAvatar, code, createdAt, ...(firstDilemma && { firstDilemma }) },
      this.#idGenerator,
    );

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
