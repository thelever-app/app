import type { RoomVariant } from '../../domain/vos/room-settings.vo.ts';
import { RoomCodeNotFoundError } from '../errors/room-code-not-found.error.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

export interface GetRoomPreviewInput {
  readonly code: string;
}

export interface GetRoomPreviewOutput {
  readonly roomId: string;
  readonly hostNickname: string;
  readonly variant: RoomVariant;
  readonly adultsOnly: boolean;
  readonly playerCount: number;
}

/** What anyone with the code sees of a room before joining it. */
export class GetRoomPreviewUseCase {
  readonly #roomRepository: RoomRepository;

  constructor(roomRepository: RoomRepository) {
    this.#roomRepository = roomRepository;
  }

  async execute({ code }: GetRoomPreviewInput): Promise<GetRoomPreviewOutput> {
    const room = await this.#roomRepository.findByCode(code);
    if (!room) throw new RoomCodeNotFoundError(code);

    return {
      roomId: room.id,
      hostNickname: room.host.nickname,
      variant: room.settings.variant,
      adultsOnly: room.settings.adultsOnly,
      playerCount: room.players.length,
    };
  }
}
