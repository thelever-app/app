import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findLobbyDilemmas } from './find-lobby-dilemmas.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface AddDilemmaInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly dilemmaId: string;
}

/** A player adds a dilemma of the general catalog to the game; nobody learns who until the reveal. */
export class AddDilemmaUseCase {
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

  async execute({ roomId, playerId, dilemmaId }: AddDilemmaInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);
    const [dilemma] = await findLobbyDilemmas(this.#dilemmaCatalog, room, [dilemmaId]);

    room.addDilemma(playerId, dilemma!);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
