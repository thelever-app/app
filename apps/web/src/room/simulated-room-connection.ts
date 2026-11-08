import {
  Dilemma,
  GetDilemmasUseCase,
  SearchDilemmasUseCase as SearchCatalogUseCase,
} from '@thelever-app/dilemmas';
import {
  InMemoryDilemmaRepository,
  SequentialIdGenerator as SequentialDilemmaIdGenerator,
} from '@thelever-app/dilemmas/in-memory';
import { loadSeedDilemmas } from '@thelever-app/dilemmas/seed';
import {
  AddDilemmaUseCase,
  AnswerDilemmaUseCase,
  ChangeAvatarUseCase,
  ChangeRoomSettingsUseCase,
  ConnectionChangedEvent,
  ConnectPlayerUseCase,
  CreateRoomUseCase,
  ExpelPlayerUseCase,
  GetGameStateUseCase,
  GetRoomStateUseCase,
  HostChangedEvent,
  JoinRoomUseCase,
  LeaveRoomUseCase,
  LobbyChangedEvent,
  PlayerLeftEvent,
  ReportDilemmaUseCase,
  RevealStartedEvent,
  RunOutTotalTimeUseCase,
  SkipDilemmaUseCase,
  StartRevealUseCase,
  TotalTimeRanOutEvent,
  type Clock,
  PickDilemmasUseCase,
  ProgressUpdatedEvent,
  RemoveAddedDilemmaUseCase,
  SearchDilemmasUseCase,
  StartGameUseCase,
  type DomainEvent,
  type ExplorationSlots,
  type PlayerNotifier,
  type Randomness,
  type RoomSettingsSnapshot,
} from '@thelever-app/game';
import { PublishedDilemmasCatalog } from '@thelever-app/integrations/game';
import {
  InMemoryDilemmaReports,
  InMemoryGameRepository,
  InMemoryRoomRepository,
  InMemorySealProvider,
  SequentialIdGenerator,
} from '@thelever-app/game/in-memory';
import {
  type ChangeSettingsDto,
  ClientMessageDto,
  ServerMessageDto,
  SearchDilemmasResponseDto,
} from '@thelever-app/protocol';
import type {
  RoomConnection,
  RoomConnectionStatus,
  RoomConnectionStatusListener,
  ServerMessageListener,
} from './room-connection.ts';

export interface SimulatedRoomOptions {
  /** The nickname of the player using the screen, who hosts the room. */
  readonly nickname: string;
  /** The language of the device: the room starts with it, and the dilemmas are written in it. */
  readonly language: string;
  /** Fake players: each one joins after `joinAfterMs` and, once the game starts, answers every `answerEveryMs`. */
  readonly others: readonly {
    readonly nickname: string;
    readonly joinAfterMs: number;
    readonly answerEveryMs: number;
  }[];
  /** The dilemmas of the catalog, all of one category; the seed ones if absent. */
  readonly dilemmas?: readonly { readonly text: string; readonly options: readonly string[] }[];
}

/** The dilemmas given to the simulation are all of one category. */
const CLASSIFICATION = { category: 'life-and-death', tags: [], minimumAge: 16 } as const;

/** The same as the room server, so a game of the simulation is composed like a real one. */
const EXPLORATION_SLOTS: ExplorationSlots = [
  { fromDilemmaCount: 6, slots: 2 },
  { fromDilemmaCount: 11, slots: 3 },
];

/** The events that reach the screen as the state it may see after them, as the room server sends them. */
const SENT_AS_STATE = [
  LobbyChangedEvent,
  TotalTimeRanOutEvent,
  RevealStartedEvent,
  HostChangedEvent,
  PlayerLeftEvent,
] as const;

/** Who uses the screen in the simulation. */
const SELF_IDENTITY = 'simulated-0';

/** Hands every event the use cases deliver to a callback, as a socket would push it. */
class CallbackPlayerNotifier implements PlayerNotifier {
  readonly #onEvent: (playerId: string, event: DomainEvent) => void;

  constructor(onEvent: (playerId: string, event: DomainEvent) => void) {
    this.#onEvent = onEvent;
  }

  async notify(playerIds: readonly string[], event: DomainEvent): Promise<void> {
    for (const playerId of playerIds) this.#onEvent(playerId, event);
  }
}

/** Good enough for a room that only runs on a developer's screen. */
const MATH_RANDOMNESS: Randomness = {
  integer: (maxExclusive) => Math.floor(Math.random() * maxExclusive),
};

/** The clock of the browser, as the room server reads its own. */
const BROWSER_CLOCK: Clock = { now: () => new Date() };

/** The parts of the configuration a message changes: those it carries, none left undefined. */
function onlyGiven(changes: ChangeSettingsDto['changes']): Partial<RoomSettingsSnapshot> {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as Partial<RoomSettingsSnapshot>;
}

/**
 * A room that runs in the browser: the use cases of `@thelever-app/game` and `@thelever-app/dilemmas`
 * with in-memory adapters, and fake players that join the lobby and answer on timers. The player
 * using the screen hosts it. It speaks the same messages as the room server, so the screen cannot
 * tell them apart. Never for production.
 */
export class SimulatedRoomConnection implements RoomConnection {
  readonly #listeners = new Set<ServerMessageListener>();
  readonly #timers: ReturnType<typeof setTimeout>[] = [];
  readonly #options: SimulatedRoomOptions;
  readonly #repositories = {
    rooms: new InMemoryRoomRepository(),
    games: new InMemoryGameRepository(),
    dilemmas: new InMemoryDilemmaRepository(),
  };
  readonly #idGenerator = new SequentialIdGenerator();
  readonly #notifier = new CallbackPlayerNotifier((to, event) => this.#onEvent(to, event));
  readonly #catalog = new PublishedDilemmasCatalog(
    new GetDilemmasUseCase(this.#repositories.dilemmas),
    new SearchCatalogUseCase(this.#repositories.dilemmas),
  );
  readonly #useCases;
  #roomId = '';
  #playerId = '';
  /** What the room sends goes out in the order it happened, as the room server sends it. */
  #outbox: Promise<void> = Promise.resolve();
  /** The fake players in the room, with their pace, to answer once the game starts. */
  readonly #fakePlayers: { readonly playerId: string; readonly answerEveryMs: number }[] = [];

  private constructor(options: SimulatedRoomOptions) {
    this.#options = options;
    const { rooms, games } = this.#repositories;
    const catalog = this.#catalog;
    const notifier = this.#notifier;
    const idGenerator = this.#idGenerator;
    const clock = BROWSER_CLOCK;
    this.#useCases = {
      createRoom: new CreateRoomUseCase(rooms, idGenerator, MATH_RANDOMNESS),
      joinRoom: new JoinRoomUseCase({
        roomRepository: rooms,
        gameRepository: games,
        notifier,
        idGenerator,
        randomness: MATH_RANDOMNESS,
      }),
      connectPlayer: new ConnectPlayerUseCase(rooms, notifier, idGenerator),
      getRoomState: new GetRoomStateUseCase(rooms, catalog),
      getGameState: new GetGameStateUseCase(rooms, games, catalog),
      searchDilemmas: new SearchDilemmasUseCase(rooms, catalog),
      changeAvatar: new ChangeAvatarUseCase(rooms, notifier),
      changeSettings: new ChangeRoomSettingsUseCase(rooms, notifier),
      pickDilemmas: new PickDilemmasUseCase(rooms, catalog, notifier),
      addDilemma: new AddDilemmaUseCase(rooms, catalog, notifier),
      removeAddedDilemma: new RemoveAddedDilemmaUseCase(rooms, notifier),
      expelPlayer: new ExpelPlayerUseCase(rooms, notifier),
      startGame: new StartGameUseCase(
        {
          roomRepository: rooms,
          gameRepository: games,
          dilemmaCatalog: catalog,
          notifier,
          idGenerator,
          randomness: MATH_RANDOMNESS,
          clock,
        },
        EXPLORATION_SLOTS,
      ),
      answerDilemma: new AnswerDilemmaUseCase({
        roomRepository: rooms,
        gameRepository: games,
        notifier,
        sealProvider: new InMemorySealProvider(),
        clock,
      }),
      startReveal: new StartRevealUseCase(rooms, games, notifier),
      runOutTotalTime: new RunOutTotalTimeUseCase(rooms, games, notifier, clock),
      leaveRoom: new LeaveRoomUseCase(rooms, games, notifier),
      skipDilemma: new SkipDilemmaUseCase({
        roomRepository: rooms,
        gameRepository: games,
        notifier,
        clock,
      }),
      reportDilemma: new ReportDilemmaUseCase({
        roomRepository: rooms,
        gameRepository: games,
        reports: new InMemoryDilemmaReports(),
        notifier,
        clock,
      }),
    };
  }

  /** Composition root: stores the dilemmas, creates the room with the player as host and lets the others in. */
  static async open(options: SimulatedRoomOptions): Promise<SimulatedRoomConnection> {
    const connection = new SimulatedRoomConnection(options);
    await connection.#setUp();
    return connection;
  }

  send(message: ClientMessageDto): void {
    this.#run(ClientMessageDto.parse(message)).catch(console.error);
  }

  subscribe(listener: ServerMessageListener): () => void {
    this.#listeners.add(listener);
    // Like a server on connect: whoever subscribes gets the current state at once.
    this.#sendState(listener).catch(console.error);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** The simulated room runs in the browser: it is connected from the start and never drops. */
  subscribeStatus(listener: RoomConnectionStatusListener): () => void {
    listener('connected');
    return () => {};
  }

  getStatus(): RoomConnectionStatus {
    return 'connected';
  }

  close(): void {
    this.#timers.forEach(clearTimeout);
    this.#listeners.clear();
  }

  /** The dilemmas of the catalog that suit the room, as the room server answers the search. */
  async searchDilemmas(criteria: {
    readonly category?: string;
    readonly q?: string;
  }): Promise<SearchDilemmasResponseDto['dilemmas']> {
    const dilemmas = await this.#useCases.searchDilemmas.execute({
      roomId: this.#roomId,
      identity: SELF_IDENTITY,
      ...(criteria.category && { category: criteria.category }),
      ...(criteria.q && { text: criteria.q }),
    });
    return SearchDilemmasResponseDto.parse({ dilemmas }).dilemmas;
  }

  async #setUp(): Promise<void> {
    const { dilemmas: repository } = this.#repositories;
    if (this.#options.dilemmas) {
      const idGenerator = new SequentialDilemmaIdGenerator('dilemma');
      for (const { text, options } of this.#options.dilemmas) {
        const language = this.#options.language;
        await repository.save(
          Dilemma.create({ ...CLASSIFICATION, text, language, options }, idGenerator),
        );
      }
    } else {
      await loadSeedDilemmas(repository);
    }

    const { roomId, hostId } = await this.#useCases.createRoom.execute({
      hostNickname: this.#options.nickname,
      hostIdentity: SELF_IDENTITY,
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: this.#options.language,
    });
    this.#roomId = roomId;
    this.#playerId = hostId;
    await this.#useCases.connectPlayer.execute({ roomId, identity: SELF_IDENTITY });

    this.#options.others.forEach(({ nickname, joinAfterMs, answerEveryMs }, index) => {
      this.#after(joinAfterMs, async () => {
        const identity = `simulated-${index + 1}`;
        const { playerId } = await this.#useCases.joinRoom.execute({ roomId, nickname, identity });
        await this.#useCases.connectPlayer.execute({ roomId, identity });
        this.#fakePlayers.push({ playerId, answerEveryMs });
      });
    });
  }

  /** What the room server does with each message: who sends it comes from the connection, never from the message. */
  async #run(message: ClientMessageDto): Promise<void> {
    const { roomId, playerId } = { roomId: this.#roomId, playerId: this.#playerId };
    const useCases = this.#useCases;
    switch (message.type) {
      // The simulated room is open from the start: there is nothing to connect to.
      case 'connect':
        return;
      case 'answer-dilemma': {
        const { dilemmaId, vote, matchPrediction, votePredictions } = message;
        await useCases.answerDilemma.execute({
          roomId,
          playerId,
          dilemmaId,
          vote,
          ...(matchPrediction !== undefined && { matchPrediction }),
          ...(votePredictions && { votePredictions }),
        });
        // The use case only tells the others: the player learns their own progress from a fresh state.
        this.#enqueue(() => this.#sendState());
        return;
      }
      case 'report-dilemma': {
        const { dilemmaId, reason, comment } = message;
        await useCases.reportDilemma.execute({
          roomId,
          playerId,
          dilemmaId,
          reason,
          ...(comment !== undefined && { comment }),
        });
        this.#enqueue(() => this.#sendState());
        return;
      }
      case 'skip-dilemma':
        await useCases.skipDilemma.execute({ roomId, playerId, dilemmaId: message.dilemmaId });
        this.#enqueue(() => this.#sendState());
        return;
      case 'start-reveal':
        await useCases.startReveal.execute({ roomId, playerId });
        return;
      case 'leave-room':
        await useCases.leaveRoom.execute({ roomId, playerId });
        this.close();
        return;
      case 'change-avatar':
        await useCases.changeAvatar.execute({
          roomId,
          playerId,
          face: message.face,
          color: message.color,
        });
        return;
      case 'change-settings':
        await useCases.changeSettings.execute({
          roomId,
          playerId,
          changes: onlyGiven(message.changes),
        });
        return;
      case 'pick-dilemmas':
        await useCases.pickDilemmas.execute({ roomId, playerId, dilemmaIds: message.dilemmaIds });
        return;
      case 'add-dilemma':
        await useCases.addDilemma.execute({ roomId, playerId, dilemmaId: message.dilemmaId });
        return;
      case 'remove-added-dilemma':
        await useCases.removeAddedDilemma.execute({
          roomId,
          playerId,
          dilemmaId: message.dilemmaId,
        });
        return;
      case 'expel-player':
        await useCases.expelPlayer.execute({
          roomId,
          playerId,
          expelledPlayerId: message.playerId,
        });
        return;
      case 'start-game':
        await useCases.startGame.execute({ roomId, playerId });
        this.#startFakePlayers();
        await this.#runOutTotalTimeOnTime();
    }
  }

  /** As the timer of the room server: when the total time ends, the room finds it over. */
  async #runOutTotalTimeOnTime(): Promise<void> {
    const { game } = await this.#gameOf(this.#playerId);
    if (!game) return;
    const left = game.totalTimeEndsAt.getTime() - BROWSER_CLOCK.now().getTime();
    this.#after(Math.max(0, left), () =>
      this.#useCases.runOutTotalTime.execute({ roomId: this.#roomId }),
    );
  }

  /**
   * Each fake player answers in order, each one with a different option so votes vary, and makes
   * every prediction a nominal room asks for.
   */
  #startFakePlayers(): void {
    this.#fakePlayers.forEach(({ playerId, answerEveryMs }, position) => {
      const answerNext = async (): Promise<void> => {
        const { game } = await this.#gameOf(playerId);
        if (game?.phase !== 'decision') return;
        const dilemma = game.dilemmas[game.players.find((p) => p.playerId === playerId)!.progress];
        if (!dilemma) return;
        const vote = dilemma.options[position % dilemma.options.length]!.optionId;
        const nominal = dilemma.predictionSubset.length > 0;
        await this.#useCases.answerDilemma.execute({
          roomId: this.#roomId,
          playerId,
          dilemmaId: dilemma.dilemmaId,
          vote,
          ...(nominal && {
            matchPrediction: MATH_RANDOMNESS.integer(game.players.length),
            votePredictions: dilemma.predictionSubset.map((predicted) => ({
              playerId: predicted,
              vote,
            })),
          }),
        });
        this.#after(answerEveryMs, answerNext);
      };
      this.#after(answerEveryMs, answerNext);
    });
  }

  /** The game a player plays now, if any. */
  async #gameOf(playerId: string) {
    const room = await this.#useCases.getRoomState.execute({ roomId: this.#roomId, playerId });
    if (!room.currentGameId) return { game: undefined };
    const game = await this.#useCases.getGameState.execute({
      gameId: room.currentGameId,
      playerId,
      language: this.#options.language,
    });
    return { game };
  }

  #after(ms: number, run: () => Promise<void>): void {
    this.#timers.push(
      setTimeout(() => {
        run().catch(console.error);
      }, ms),
    );
  }

  /** Sends the player what they may see now, the lobby or the game, to one listener or to all of them. */
  async #sendState(listener?: ServerMessageListener): Promise<void> {
    const { game } = await this.#gameOf(this.#playerId);
    if (game) {
      const message = {
        type: 'game-state',
        ...game,
        totalTimeEndsAt: game.totalTimeEndsAt.toISOString(),
        serverTime: BROWSER_CLOCK.now().toISOString(),
      };
      this.#emit(ServerMessageDto.parse(message), listener);
      return;
    }
    const room = await this.#useCases.getRoomState.execute({
      roomId: this.#roomId,
      playerId: this.#playerId,
    });
    this.#emit(ServerMessageDto.parse({ type: 'room-state', ...room }), listener);
  }

  #onEvent(playerId: string, event: DomainEvent): void {
    if (playerId !== this.#playerId) return;
    if (SENT_AS_STATE.some((type) => event instanceof type)) {
      this.#enqueue(() => this.#sendState());
    } else if (event instanceof ProgressUpdatedEvent) {
      const message = ServerMessageDto.parse({
        type: 'progress-updated',
        gameVersion: event.gameVersion,
        playerId: event.playerId,
        progress: event.progress,
      });
      this.#enqueue(async () => this.#emit(message));
    } else if (event instanceof ConnectionChangedEvent) {
      const message = ServerMessageDto.parse({
        type: 'connection-changed',
        roomVersion: event.roomVersion,
        playerId: event.playerId,
        connected: event.connected,
      });
      this.#enqueue(async () => this.#emit(message));
    }
  }

  /** After whatever the room is still sending, so nothing overtakes what happened before it. */
  #enqueue(send: () => Promise<void>): void {
    this.#outbox = this.#outbox.then(send).catch(console.error);
  }

  #emit(message: ServerMessageDto, only?: ServerMessageListener): void {
    for (const listener of only ? [only] : this.#listeners) listener(message);
  }
}
