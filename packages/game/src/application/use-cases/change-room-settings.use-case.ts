import type { RoomSettingsChanges } from '../../domain/entities/room.ts';
import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoundDilemmas } from './find-lobby-dilemmas.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface ChangeRoomSettingsInput {
  readonly roomId: string;
  readonly playerId: string;
  readonly changes: RoomSettingsChanges;
}

/**
 * The host changes the settings of the room in the lobby; everyone sees the new ones. The room is
 * given, as the catalog has them in the language of the new settings, the specific dilemmas it does
 * not know yet and, if the language changes, every dilemma of its rounds.
 */
export class ChangeRoomSettingsUseCase {
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

  async execute({ roomId, playerId, changes }: ChangeRoomSettingsInput): Promise<void> {
    const room = await findRoom(this.#roomRepository, roomId);
    const known = room.roundDilemmaIds;
    const dilemmaIds = (changes.rounds ?? []).flatMap((round) =>
      round.origin === 'specific' && !known.includes(round.dilemmaId) ? [round.dilemmaId] : [],
    );
    const dilemmas = await findRoundDilemmas(
      this.#dilemmaCatalog,
      room.settings.dilemmaLanguage,
      dilemmaIds,
    );

    room.changeSettings(playerId, changes, dilemmas);
    const events = room.pullEvents();
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);
  }
}
