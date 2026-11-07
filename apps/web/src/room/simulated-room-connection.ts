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
  JoinRoomUseCase,
  LobbyChangedEvent,
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
  /** The dilemmas of the catalog, in the category the room starts with; the seed ones if absent. */
  readonly dilemmas?: readonly { readonly text: string; readonly options: readonly string[] }[];
}

/** The catalog of the simulation has a single category: the one a room starts with. */
const CLASSIFICATION = { category: 'life-and-death', tags: [], minimumAge: 16 } as const;

/** The same as the room server, so a game of the simulation is composed like a real one. */
const EXPLORATION_SLOTS: ExplorationSlots = [
  { fromDilemmaCount: 6, slots: 2 },
  { fromDilemmaCount: 11, slots: 3 },
];

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
    this.#useCases = {
      createRoom: new CreateRoomUseCase(rooms, idGenerator, MATH_RANDOMNESS),
      joinRoom: new JoinRoomUseCase(rooms, notifier, idGenerator, MATH_RANDOMNESS),
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
        },
        EXPLORATION_SLOTS,
      ),
      answerDilemma: new AnswerDilemmaUseCase(rooms, games, notifier, new InMemorySealProvider()),
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
    readonly tags?: readonly string[];
  }): Promise<SearchDilemmasResponseDto['dilemmas']> {
    const dilemmas = await this.#useCases.searchDilemmas.execute({
      roomId: this.#roomId,
      identity: SELF_IDENTITY,
      ...(criteria.category && { category: criteria.category }),
      ...(criteria.tags && { tags: criteria.tags }),
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
        const { dilemmaId, vote } = message;
        await useCases.answerDilemma.execute({ roomId, playerId, dilemmaId, vote });
        // The use case only tells the others: the player learns their own progress from a fresh state.
        this.#enqueue(() => this.#sendState());
        return;
      }
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
    }
  }

  /** Each fake player answers in order, each one with a different option so votes vary. */
  #startFakePlayers(): void {
    this.#fakePlayers.forEach(({ playerId, answerEveryMs }, position) => {
      const answerNext = async (): Promise<void> => {
        const { game } = await this.#gameOf(playerId);
        const dilemma = game?.dilemmas[game.players.find((p) => p.playerId === playerId)!.progress];
        if (!dilemma) return;
        const vote = dilemma.options[position % dilemma.options.length]!.optionId;
        await this.#useCases.answerDilemma.execute({
          roomId: this.#roomId,
          playerId,
          dilemmaId: dilemma.dilemmaId,
          vote,
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
      this.#emit(ServerMessageDto.parse({ type: 'game-state', ...game }), listener);
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
    if (event instanceof LobbyChangedEvent) {
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
