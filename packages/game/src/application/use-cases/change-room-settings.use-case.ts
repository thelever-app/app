import type { RoomSettingsSnapshot } from '../../domain/vos/room-settings.vo.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface ChangeRoomSettingsInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly changes: Partial<RoomSettingsSnapshot>;
}

/** The host changes the settings of the room in the lobby; everyone sees the new ones. */
export class ChangeRoomSettingsUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId, changes }: ChangeRoomSettingsInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);

    room.changeSettings(playerId, changes);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
