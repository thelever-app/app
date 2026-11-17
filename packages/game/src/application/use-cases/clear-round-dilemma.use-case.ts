import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface ClearRoundDilemmaInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly roundId: number;
}

/** The player who chose the dilemma of a round of the players takes it out; the round is empty again. */
export class ClearRoundDilemmaUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #notifier: PlayerNotifier;

  constructor(roomRepository: RoomRepository, notifier: PlayerNotifier) {
    this.#roomRepository = roomRepository;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId, roundId }: ClearRoundDilemmaInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);

    room.clearRoundDilemma(playerId, roundId);
    const events = room.pullEvents();
    if (events.length > 0) await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
