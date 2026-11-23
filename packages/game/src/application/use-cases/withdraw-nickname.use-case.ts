import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { notifyRoom } from './notify-room.ts';

export interface WithdrawNicknameInput {
  /** Who goes by the nickname. */
  readonly identity: string;
  readonly nickname: string;
}

/** How another context withdraws a nickname from the rooms. */
export interface WithdrawNickname {
  execute(input: WithdrawNicknameInput): Promise<void>;
}

/**
 * Moderation withdrew a nickname: in every room where that player goes by it, they take the
 * generic nickname of the room, and everyone there sees it.
 */
export class WithdrawNicknameUseCase implements WithdrawNickname {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ identity, nickname }: WithdrawNicknameInput): Promise<void> {
    for (const roomId of await this.#roomRepository.findIdsWith(identity)) {
      const room = await this.#roomRepository.findById(roomId);
      if (!room?.withdrawNickname(identity, nickname)) continue;
      const events = room.pullEvents();
      await this.#roomRepository.save(room);
      await notifyRoom(room, events, this.#notifier);
    }
  }
}
