import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface RemoveAddedDilemmaInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly dilemmaId: string;
}

/** The host removes a dilemma a player added, without knowing who; a player, one they added. */
export class RemoveAddedDilemmaUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId, dilemmaId }: RemoveAddedDilemmaInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);

    room.removeAddedDilemma(playerId, dilemmaId);
    const events = room.pullEvents();
    if (events.length > 0) await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
