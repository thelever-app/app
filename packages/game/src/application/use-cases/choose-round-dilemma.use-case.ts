import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findLobbyDilemmas } from './find-lobby-dilemmas.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface ChooseRoundDilemmaInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly roundId: number;
  readonly dilemmaId: string;
}

/**
 * A player chooses a dilemma of the general catalog for a round of the players; everyone sees it, and
 * nobody learns who chose it until the reveal.
 */
export class ChooseRoundDilemmaUseCase {
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

  async execute({ roomId, playerId, roundId, dilemmaId }: ChooseRoundDilemmaInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);
    const [dilemma] = await findLobbyDilemmas(this.#dilemmaCatalog, room.settings.dilemmaLanguage, [
      dilemmaId,
    ]);

    room.chooseRoundDilemma(playerId, roundId, dilemma!);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
