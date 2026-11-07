import { IdentityNotInRoomError } from '../errors/identity-not-in-room.error.ts';
import type { CatalogDilemma, DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface SearchDilemmasInput {
  readonly roomId: string;
  /** Whoever searches must be a player of the room: a query asked over HTTP knows only their identity. */
  readonly identity: string;
  /** One category, or every one. */
  readonly category?: string;
  /** What the player typed, looked for in the text and the tags. */
  readonly text?: string;
}

/**
 * The dilemmas of the general catalog that suit the room, in its language, to pick or add one;
 * with a text, the ones that match it best first.
 */
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
    text,
  }: SearchDilemmasInput): Promise<readonly CatalogDilemma[]> {
    const room = await findRoom(this.#roomRepository, roomId);
    if (!room.playerWith(identity)) throw new IdentityNotInRoomError(roomId);

    return this.#dilemmaCatalog.search({
      ...(category && { categories: [category] }),
      ...(text && { text }),
      maximumMinimumAge: room.settings.maximumMinimumAge,
      status: 'in-catalog',
      language: room.settings.dilemmaLanguage,
    });
  }
}
