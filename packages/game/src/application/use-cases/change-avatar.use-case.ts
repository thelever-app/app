import { AvatarVO } from '../../domain/vos/avatar.vo.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface ChangeAvatarInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly face: string;
  readonly color: string;
}

/** A player changes to an avatar nobody else in the room has; everyone sees it. */
export class ChangeAvatarUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId, face, color }: ChangeAvatarInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);

    room.changeAvatar(playerId, new AvatarVO(face, color));
    const events = room.pullEvents();
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
