import { Game } from '../../domain/entities/game.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import {
  categoriesKey,
  categoriesToDraw,
  composeGame,
  type Candidates,
  type ExplorationSlots,
} from '../../domain/services/compose-game.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
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
 * The host starts the game the lobby got ready: it is put together from the rounds of the room and
 * goes straight into the decision phase with everyone in the room, and the time of its first round
 * starts.
 */
export class StartGameUseCase {
  readonly #roomRepository: RoomRepository;
  readonly #gameRepository: GameRepository;
  readonly #dilemmaCatalog: DilemmaCatalog;
  readonly #notifier: PlayerNotifier;
  readonly #idGenerator: IdGenerator;
  readonly #randomness: Randomness;
  readonly #clock: Clock;
  readonly #explorationSlots: ExplorationSlots;

  constructor(
    ports: {
      readonly roomRepository: RoomRepository;
      readonly gameRepository: GameRepository;
      readonly dilemmaCatalog: DilemmaCatalog;
      readonly notifier: PlayerNotifier;
      readonly idGenerator: IdGenerator;
      readonly randomness: Randomness;
      readonly clock: Clock;
    },
    explorationSlots: ExplorationSlots,
  ) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#dilemmaCatalog = ports.dilemmaCatalog;
    this.#notifier = ports.notifier;
    this.#idGenerator = ports.idGenerator;
    this.#randomness = ports.randomness;
    this.#clock = ports.clock;
    this.#explorationSlots = explorationSlots;
  }

  async execute({ roomId, playerId }: StartGameInput): Promise<StartGameOutput> {
    const room = await findRoom(this.#roomRepository, roomId);
    // Nothing is put together for a game that cannot start.
    room.ensureCanStartGame(playerId);
    const { settings } = room;

    // Only their ids, for each set of categories a round draws from: the game reads nothing else.
    const idsOf = async (
      categories: readonly Category[] | null,
      status: 'in-catalog' | 'in-exploration',
    ): Promise<string[]> => [
      ...(await this.#dilemmaCatalog.findCandidateIds({
        // Null plays every category: the search then looks at all of them.
        ...(categories && { categories }),
        maximumMinimumAge: settings.maximumMinimumAge,
        status,
        language: settings.dilemmaLanguage,
        includeCompromising: settings.includesCompromisingDilemmas,
      })),
    ];
    const candidates = new Map<string, Candidates>(
      await Promise.all(
        categoriesToDraw(settings.rounds, room.chosenDilemmas).map(
          async (categories): Promise<[string, Candidates]> => [
            categoriesKey(categories),
            {
              inCatalog: await idsOf(categories, 'in-catalog'),
              inExploration: settings.newDilemmas ? await idsOf(categories, 'in-exploration') : [],
            },
          ],
        ),
      ),
    );
    const composed = composeGame(
      {
        rounds: settings.rounds,
        chosenDilemmas: room.chosenDilemmas,
        newDilemmas: settings.newDilemmas,
        candidates,
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
          chosenBy: composed[index]!.chosenBy,
        })),
        settings: {
          variant: settings.variant,
          groupNature: room.groupNature,
          place: room.place,
          dilemmaLanguage: settings.dilemmaLanguage,
          timePerDilemmaSeconds: settings.timePerDilemmaSeconds,
        },
      },
      this.#idGenerator,
    );
    room.startGame(playerId, game.id);
    game.start(room.players, this.#clock.now(), this.#randomness);
    const events = room.pullEvents();
    await this.#gameRepository.save(game);
    await this.#roomRepository.save(room);
    await notifyRoom(room, events, this.#notifier);

    return { gameId: game.id };
  }
}
