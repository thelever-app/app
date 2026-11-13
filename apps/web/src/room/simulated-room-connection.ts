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
  MoveOnUseCase,
  PlayerJoinedLateEvent,
  PlayerLeftEvent,
  ReportDilemmaUseCase,
  RevealEarlyUseCase,
  RunOutRoundUseCase,
  SkipDilemmaUseCase,
  type Clock,
  PickDilemmasUseCase,
  ProgressUpdatedEvent,
  AnsweredCountChangedEvent,
  DilemmaRevealedEvent,
  RoundStartedEvent,
  RemoveAddedDilemmaUseCase,
  SearchDilemmasUseCase,
  StartGameUseCase,
  type DomainEvent,
  type ExplorationSlots,
  type PlayerNotifier,
  type Randomness,
  type RoomSettingsSnapshot,
  AvatarVO,
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
  /** Fake players: each one joins after `joinAfterMs` and answers each round `answerAfterMs` after it starts. */
  readonly others: readonly {
    readonly nickname: string;
    readonly joinAfterMs: number;
    readonly answerAfterMs: number;
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
  DilemmaRevealedEvent,
  RoundStartedEvent,
  HostChangedEvent,
  PlayerLeftEvent,
  PlayerJoinedLateEvent,
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

/** The host wears the first avatar and each fake player the next one, so all of them look apart. */
function avatarNumber(index: number): { readonly face: string; readonly color: string } {
  const avatar = AvatarVO.all()[index];
  if (!avatar) throw new Error(`There is no avatar number ${index}`);
  return { face: avatar.face, color: avatar.color };
}

/** The parts of the configuration a message changes: those it carries, none left undefined. */
function onlyGiven(changes: ChangeSettingsDto['changes']): Partial<RoomSettingsSnapshot> {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as Partial<RoomSettingsSnapshot>;
}

/**
 * A room that runs in the browser: the use cases of `@thelever-app/game` and `@thelever-app/dilemmas`
 * with in-memory adapters, and fake players that join the lobby and answer each round on a timer.
 * The player using the screen hosts it and is the only one who moves on from each reveal. It speaks the same messages as the room server, so the screen cannot
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
  /** The fake players in the room, with their pace, to answer each round. */
  readonly #fakePlayers: { readonly playerId: string; readonly answerAfterMs: number }[] = [];

  private constructor(options: SimulatedRoomOptions) {
    this.#options = options;
    const { rooms, games } = this.#repositories;
    const catalog = this.#catalog;
    const notifier = this.#notifier;
    const idGenerator = this.#idGenerator;
    const clock = BROWSER_CLOCK;
    this.#useCases = {
      createRoom: new CreateRoomUseCase(rooms, idGenerator, MATH_RANDOMNESS, clock),
      joinRoom: new JoinRoomUseCase({
        roomRepository: rooms,
        gameRepository: games,
        notifier,
        idGenerator,
        randomness: MATH_RANDOMNESS,
        clock,
      }),
      connectPlayer: new ConnectPlayerUseCase(rooms, games, notifier, idGenerator, clock),
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
      revealEarly: new RevealEarlyUseCase(rooms, games, notifier, clock),
      moveOn: new MoveOnUseCase(rooms, games, notifier, clock),
      runOutRound: new RunOutRoundUseCase(rooms, games, notifier, clock),
      leaveRoom: new LeaveRoomUseCase(rooms, games, notifier, clock),
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
      hostAvatar: avatarNumber(0),
      groupNature: 'friends',
      place: 'together',
      dilemmaLanguage: this.#options.language,
    });
    this.#roomId = roomId;
    this.#playerId = hostId;
    await this.#useCases.connectPlayer.execute({ roomId, identity: SELF_IDENTITY });

    this.#options.others.forEach(({ nickname, joinAfterMs, answerAfterMs }, index) => {
      this.#after(joinAfterMs, async () => {
        const identity = `simulated-${index + 1}`;
        const { playerId } = await this.#useCases.joinRoom.execute({
          roomId,
          nickname,
          identity,
          avatar: avatarNumber(index + 1),
        });
        await this.#useCases.connectPlayer.execute({ roomId, identity });
        this.#fakePlayers.push({ playerId, answerAfterMs });
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
        const { dilemmaId, vote, votePredictions } = message;
        await useCases.answerDilemma.execute({
          roomId,
          playerId,
          dilemmaId,
          vote,
          ...(votePredictions && { votePredictions }),
        });
        // The use case only tells the others: the player learns their own answer from a fresh state.
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
      case 'reveal-early':
        await useCases.revealEarly.execute({ roomId, playerId });
        return;
      case 'move-on':
        await useCases.moveOn.execute({ roomId, playerId, fromPosition: message.fromPosition });
        await this.#playRound();
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
        await this.#playRound();
    }
  }

  /**
   * The round that just started: each fake player answers it when their time comes, each one with a
   * different option so votes vary and with every prediction a nominal room asks for; and, as the
   * timer of the room server, the room runs it out when its time ends.
   */
  async #playRound(): Promise<void> {
    const { game } = await this.#gameOf(this.#playerId);
    if (game?.round.phase !== 'decision') return;
    const { position, endsAt } = game.round;
    this.#fakePlayers.forEach(({ playerId, answerAfterMs }, index) => {
      this.#after(answerAfterMs, async () => {
        const { game: seen } = await this.#gameOf(playerId);
        if (seen?.round.position !== position || seen.round.phase !== 'decision') return;
        const dilemma = seen.dilemmas[position]!;
        const vote = dilemma.options[index % dilemma.options.length]!.optionId;
        await this.#useCases.answerDilemma.execute({
          roomId: this.#roomId,
          playerId,
          dilemmaId: dilemma.dilemmaId,
          vote,
          votePredictions: seen.playersToPredict.map((predicted) => ({
            playerId: predicted,
            vote,
          })),
        });
      });
    });
    const left = endsAt.getTime() - BROWSER_CLOCK.now().getTime();
    this.#after(Math.max(0, left), () =>
      this.#useCases.runOutRound.execute({ roomId: this.#roomId }),
    );
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
        round: { ...game.round, endsAt: game.round.endsAt.toISOString() },
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
        type: 'player-answered',
        gameVersion: event.gameVersion,
        playerId: event.playerId,
      });
      this.#enqueue(async () => this.#emit(message));
    } else if (event instanceof AnsweredCountChangedEvent) {
      const message = ServerMessageDto.parse({
        type: 'answered-count',
        gameVersion: event.gameVersion,
        answeredCount: event.answeredCount,
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
