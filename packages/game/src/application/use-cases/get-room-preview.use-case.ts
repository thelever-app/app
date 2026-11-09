import type { Randomness } from '../../domain/ports/randomness.port.ts';
import type { RoomVariant } from '../../domain/vos/room-settings.vo.ts';
import { RoomCodeNotFoundError } from '../errors/room-code-not-found.error.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface GetRoomPreviewInput {
  readonly code: string;
}

interface PreviewAvatar {
  readonly face: string;
  readonly color: string;
}

export interface GetRoomPreviewOutput {
  readonly roomId: string;
  readonly hostNickname: string;
  readonly variant: RoomVariant;
  readonly adultsOnly: boolean;
  /** Who is inside, in the order they came in, without their ids or identities. */
  readonly players: readonly { readonly nickname: string; readonly avatar: PreviewAvatar }[];
  /** An avatar nobody inside has, for whoever is about to join. */
  readonly suggestedAvatar: PreviewAvatar;
}

/** What anyone with the code sees of a room before joining it. */
export class GetRoomPreviewUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #randomness: Randomness;

  constructor(roomRepository: RoomRepository, randomness: Randomness) {
    this.#roomRepository = roomRepository;
    this.#randomness = randomness;
  }

  async execute({ code }: GetRoomPreviewInput): Promise<GetRoomPreviewOutput> {
    const room = await this.#roomRepository.findByCode(code);
    if (!room) throw new RoomCodeNotFoundError(code);

    const { face, color } = room.suggestAvatar(this.#randomness);
    return {
      roomId: room.id,
      hostNickname: room.host.nickname,
      variant: room.settings.variant,
      adultsOnly: room.settings.adultsOnly,
      players: room.players.map(({ nickname, avatar }) => ({
        nickname,
        avatar: { face: avatar.face, color: avatar.color },
      })),
      suggestedAvatar: { face, color },
    };
  }
}
