import { Game } from '../../domain/entities/game.ts';
import type { Clock } from '../../domain/ports/clock.port.ts';
import type { IdGenerator } from '../../domain/ports/id-generator.port.ts';
import type { Randomness } from '../../domain/ports/randomness.port.ts';
import {
  drawKey,
  categoriesToDraw,
  composeGame,
  fixedDilemmaIds,
  type Candidates,
  type ExplorationSlots,
} from '../../domain/services/compose-game.ts';
import { ambienceOf } from '../../domain/vos/ambience.vo.ts';
import type { Category } from '../../domain/vos/category.vo.ts';
import type { CandidateDilemma } from '../../domain/vos/classification.vo.ts';
import type { RoundContent } from '../../domain/vos/round.vo.ts';
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
 * The host starts the game the lobby got ready: it is put together from the rounds of the room,
 * spaced and with what nobody in the room has played first, and goes straight into the decision
 * phase with everyone in the room, and the time of its first round starts.
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
  readonly #candidatesPerRound: number;

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
    /**
     * How many candidates a round draws its dilemma from, at most: enough to space it and for
     * rounds of categories in common, never the whole catalog. A setting, not a rule of the game.
     */
    candidatesPerRound: number,
  ) {
    this.#roomRepository = ports.roomRepository;
    this.#gameRepository = ports.gameRepository;
    this.#dilemmaCatalog = ports.dilemmaCatalog;
    this.#notifier = ports.notifier;
    this.#idGenerator = ports.idGenerator;
    this.#randomness = ports.randomness;
    this.#clock = ports.clock;
    this.#explorationSlots = explorationSlots;
    this.#candidatesPerRound = candidatesPerRound;
  }

  async execute({ roomId, playerId }: StartGameInput): Promise<StartGameOutput> {
    const room = await findRoom(this.#roomRepository, roomId);
    // Nothing is put together for a game that cannot start.
    room.ensureCanStartGame(playerId);
    const { settings } = room;

    // Only how to space them and whether they have the gap, of a few drawn at random for each set
    // of categories a round draws from: the game reads nothing else, and never the whole catalog.
    const { playsTheGap } = room;
    // Nor the dilemmas the room played in its games before, so a rematch never repeats one.
    const excludedIds = [
      ...fixedDilemmaIds(settings.rounds, room.chosenDilemmas, playsTheGap),
      ...room.playedDilemmaIds,
    ];
    const playedBy = [...room.playedBy].map(([dilemmaId, players]) => ({ dilemmaId, players }));
    const candidatesOf = async (
      categories: readonly Category[] | null,
      content: RoundContent,
      rounds: number,
      status: 'in-catalog' | 'in-exploration',
    ): Promise<CandidateDilemma[]> => [
      ...(await this.#dilemmaCatalog.findCandidates({
        // Null plays every category: the search then looks at all of them.
        ...(categories && { categories }),
        maximumMinimumAge: settings.maximumMinimumAge,
        status,
        language: settings.dilemmaLanguage,
        includeCompromising: settings.compromisingDilemmas,
        count: rounds * this.#candidatesPerRound,
        includeGap: playsTheGap,
        excludedIds,
        content,
        playedBy,
      })),
    ];
    const candidatesFor = async (rounds: typeof settings.rounds) =>
      new Map<string, Candidates>(
        await Promise.all(
          categoriesToDraw(rounds, room.chosenDilemmas, playsTheGap).map(
            async ({ categories, content, rounds }): Promise<[string, Candidates]> => [
              drawKey(categories, content),
              {
                inCatalog: await candidatesOf(categories, content, rounds, 'in-catalog'),
                inExploration: settings.newDilemmas
                  ? await candidatesOf(categories, content, rounds, 'in-exploration')
                  : [],
              },
            ],
          ),
        ),
      );
    // In a rematch, the random rounds beyond the dilemmas their categories have left that the room
    // has not played play from every category, as its lobby warned the host.
    const firstDraw = await candidatesFor(settings.rounds);
    const left = (categories: readonly Category[]) => {
      const drawn = firstDraw.get(drawKey(categories, 'any'));
      return new Set(
        [...(drawn?.inCatalog ?? []), ...(drawn?.inExploration ?? [])].map(
          ({ dilemmaId }) => dilemmaId,
        ),
      ).size;
    };
    const played = new Map<string, number>();
    let fellBack = false;
    const rounds = settings.rounds.map((round) => {
      if (round.origin !== 'random' || round.categories === null) return round;
      if (room.playedDilemmaIds.length === 0) return round;
      const key = drawKey(round.categories, 'any');
      const before = played.get(key) ?? 0;
      played.set(key, before + 1);
      if (before < left(round.categories)) return round;
      fellBack = true;
      return { ...round, categories: null };
    });
    const candidates = fellBack ? await candidatesFor(rounds) : firstDraw;
    const composed = composeGame(
      {
        rounds,
        chosenDilemmas: room.chosenDilemmas,
        newDilemmas: settings.newDilemmas,
        candidates,
        explorationSlots: this.#explorationSlots,
        playsTheGap,
        playedBy: room.playedBy,
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
          ambience: ambienceOf(settings),
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
