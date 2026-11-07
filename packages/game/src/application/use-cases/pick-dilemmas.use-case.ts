import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findLobbyDilemmas } from './find-lobby-dilemmas.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface PickDilemmasInput {
  readonly roomId: string;
  readonly playerId: string;
  /** In the order the host picked them; none goes back to a game by category. */
  readonly dilemmaIds: readonly string[];
}

/** The host picks the dilemmas of the game one by one, from the general catalog. */
export class PickDilemmasUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #dilemmaCatalog: DilemmaCatalog;
  readonly #notifier: PlayerNotifier;

  constructor(
    roomRepository: RoomRepository,
    dilemmaCatalog: DilemmaCatalog,
    notifier: PlayerNotifier,
  ) {
    this.#roomRepository = roomRepository;
    this.#dilemmaCatalog = dilemmaCatalog;
    this.#notifier = notifier;
  }

  async execute({ roomId, playerId, dilemmaIds }: PickDilemmasInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);
    const dilemmas = await findLobbyDilemmas(this.#dilemmaCatalog, room, dilemmaIds);

    room.pickDilemmas(playerId, dilemmas);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
