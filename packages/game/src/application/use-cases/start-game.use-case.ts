import { Game } from '../../domain/entities/game.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import { composeGame, type ExplorationSlots } from '../../domain/services/compose-game.ts';
import type { DilemmaCatalog } from '../ports/dilemma-catalog.port.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { findRoom } from './find-room.ts';
import { notifyRoom } from './notify-room.ts';

export interface StartGameInput {
  readonly roomId: string;
  /** The host, who starts it. */
  readonly playerId: string;
}

export interface StartGameOutput {
  readonly gameId: string;
}

/**
 * The host starts the game the lobby got ready: it is put together from the settings of the room
 * and goes straight into the decision phase with everyone in the room.
 */
export class StartGameUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #dilemmaCatalog: DilemmaCatalog;
  readonly #notifier: PlayerNotifier;
  readonly #idGenerator: IdGenerator;
  readonly #randomness: Randomness;
  readonly #explorationSlots: ExplorationSlots;

  constructor(
    ports: {
      readonly roomRepository: RoomRepository;
      readonly gameRepository: GameRepository;
      readonly dilemmaCatalog: DilemmaCatalog;
      readonly notifier: PlayerNotifier;
      readonly idGenerator: IdGenerator;
      readonly randomness: Randomness;
    },
    explorationSlots: ExplorationSlots,
  ) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#dilemmaCatalog = ports.dilemmaCatalog;
    this.#notifier = ports.notifier;
    this.#idGenerator = ports.idGenerator;
    this.#randomness = ports.randomness;
    this.#explorationSlots = explorationSlots;
  }

  async execute({ roomId, playerId }: StartGameInput): Promise<StartGameOutput> {
    const room = await findRoom(this.#roomRepository, roomId);
    const { settings } = room;

    const candidates = async (status: 'in-catalog' | 'in-exploration'): Promise<string[]> =>
      (
        await this.#dilemmaCatalog.search({
          category: settings.category,
          maximumMinimumAge: settings.maximumMinimumAge,
          status,
          language: settings.dilemmaLanguage,
        })
      ).map(({ dilemmaId }) => dilemmaId);
    const composed = composeGame(
      {
        settings,
        pickedDilemmas: room.pickedDilemmas,
        addedDilemmas: room.addedDilemmas,
        candidates: {
          inCatalog: await candidates('in-catalog'),
          inExploration: await candidates('in-exploration'),
        },
        explorationSlots: this.#explorationSlots,
      },
      this.#randomness,
    );

    // The game keeps the options of each dilemma, which its rules need; the text stays in Dilemmas.
    const structures = await this.#dilemmaCatalog.findOptionIds(
      composed.map(({ dilemmaId }) => dilemmaId),
    );
    const game = Game.create(
      {
        roomId: room.id,
        dilemmas: structures.map((structure, index) => ({
          ...structure,
          origin: composed[index]!.origin,
        })),
        settings: {
          variant: settings.variant,
          groupNature: room.groupNature,
          place: room.place,
          dilemmaLanguage: settings.dilemmaLanguage,
          totalTimeInMinutes: settings.totalTimeInMinutes,
        },
      },
      this.#idGenerator,
    );
    // Throws if the player is not the host, the room has too few players or a game in progress.
    room.startGame(playerId, game.id);
    game.startDecisionPhase(room.players);
    const events = room.pullEvents();
    await this.#gameRepository.save(game);
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);

    return { gameId: game.id };
  }
}
