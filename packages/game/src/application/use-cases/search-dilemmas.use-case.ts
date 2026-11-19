import type { Category } from '../../domain/vos/category.vo.ts';
import { IdentityNotInRoomError } from '../errors/identity-not-in-room.error.ts';
import type { CatalogPage, DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';

export interface SearchDilemmasInput {
  readonly roomId: string;
  /** Whoever searches must be a player of the room: a query asked over HTTP knows only their identity. */
  readonly identity: string;
  /** One category, or every one. */
  readonly category?: Category;
  /** What the player typed, looked for in the text and the tags. */
  readonly text?: string;
  /** The `next` of the page before; none for the first page. */
  readonly after?: string;
}

/** How many dilemmas a page of the search shows. */
export const SEARCH_PAGE_SIZE = 20;

/**
 * The dilemmas of the general catalog that suit the room, in its language, to pick or add one,
 * twenty at a time; with a text, the ones that match it best first.
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
    after,
  }: SearchDilemmasInput): Promise<CatalogPage> {
    const room = await findRoom(this.#roomRepository, roomId);
    if (!room.playerWith(identity)) throw new IdentityNotInRoomError(roomId);

    const criteria = {
      ...(category && { categories: [category] }),
      ...(text && { text }),
      maximumMinimumAge: room.settings.maximumMinimumAge,
      status: 'in-catalog' as const,
      language: room.settings.dilemmaLanguage,
      includeCompromising: room.settings.compromisingDilemmas,
    };
    // What the room already played cannot be chosen again. A page left empty by it goes on to the
    // next one, so the list never looks over while there are more.
    const played = new Set(room.playedDilemmaIds);
    let from = after;
    for (;;) {
      const page = await this.#dilemmaCatalog.search(criteria, {
        size: SEARCH_PAGE_SIZE,
        ...(from !== undefined && { after: from }),
      });
      const dilemmas = page.dilemmas.filter(({ dilemmaId }) => !played.has(dilemmaId));
      if (dilemmas.length > 0 || page.next === undefined) return { ...page, dilemmas };
      from = page.next;
    }
  }
}
