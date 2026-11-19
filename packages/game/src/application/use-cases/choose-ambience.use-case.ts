import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface ChooseAmbienceInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly ambience: string;
}

/**
 * The host chooses an ambience in the lobby: the room takes its configuration, keeping its
 * language, its time per dilemma and new dilemmas, and everyone sees it.
 */
export class ChooseAmbienceUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId, ambience }: ChooseAmbienceInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);
    room.chooseAmbience(playerId, ambience);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
