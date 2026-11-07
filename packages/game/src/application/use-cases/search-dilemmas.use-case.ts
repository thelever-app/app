import { IdentityNotInRoomError } from '../errors/identity-not-in-room.error.ts';
import type { CatalogDilemma, DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface SearchDilemmasInput {
  readonly roomId: string;
  /** Whoever searches must be a player of the room: a query asked over HTTP knows only their identity. */
  readonly identity: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}

/** The dilemmas of the general catalog that suit the room, in its language, to pick or add one. */
export class SearchDilemmasUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #dilemmaCatalog: DilemmaCatalog;

  constructor(roomRepository: RoomRepository, dilemmaCatalog: DilemmaCatalog) {
    this.#roomRepository = roomRepository;
    this.#dilemmaCatalog = dilemmaCatalog;
  }

  async execute({
    roomId,
    identity,
    category,
    tags,
  }: SearchDilemmasInput): Promise<readonly CatalogDilemma[]> {
    const room = await findRoom(this.#roomRepository, roomId);
    if (!room.playerWith(identity)) throw new IdentityNotInRoomError(roomId);

    return this.#dilemmaCatalog.search({
      ...(category && { category }),
      ...(tags && { tags }),
      maximumMinimumAge: room.settings.maximumMinimumAge,
      status: 'in-catalog',
      language: room.settings.dilemmaLanguage,
    });
  }
}
