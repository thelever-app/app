import { Dilemma, GetDilemmasUseCase } from '@thelever-app/dilemmas';
import {
  InMemoryDilemmaRepository,
  SequentialIdGenerator as SequentialDilemmaIdGenerator,
} from '@thelever-app/dilemmas/in-memory';
import {
  AnswerDilemmaUseCase,
  CreateRoomUseCase,
  GetGameStateUseCase,
  JoinRoomUseCase,
  ProgressUpdatedEvent,
  StartDecisionPhaseUseCase,
  type DilemmaCatalog,
  type DomainEvent,
  type GameDilemma,
  type GameRepository,
  type PlayerNotifier,
  type RoomRepository,
} from '@thelever-app/game';
import { DilemmasContextCatalog } from '@thelever-app/game/dilemmas';
import {
  InMemoryGameRepository,
  InMemoryRoomRepository,
  SequentialIdGenerator,
} from '@thelever-app/game/in-memory';
import { ClientMessageDto, ServerMessageDto } from '@thelever-app/protocol';
import type { RoomConnection, ServerMessageListener } from './room-connection.ts';

export interface SimulatedRoomOptions {
  /** The nickname of the player using the screen, who hosts the room. */
  readonly nickname: string;
  /** The language the dilemmas are written in, and the one the player reads them in. */
  readonly language: string;
  /** Fake players: each one answers the next dilemma every `answerEveryMs`. */
  readonly others: readonly { readonly nickname: string; readonly answerEveryMs: number }[];
  /** The content of the dilemmas of the game, in the order every player gets them. */
  readonly dilemmas: readonly { readonly text: string; readonly options: readonly string[] }[];
}

/** Hands every event the use cases deliver to a callback, as a socket would push it. */
class CallbackPlayerNotifier implements PlayerNotifier {
  readonly #onEvent: (playerId: string, event: DomainEvent) => void;

  constructor(onEvent: (playerId: string, event: DomainEvent) => void) {
    this.#onEvent = onEvent;
  }

  async notify(playerId: string, event: DomainEvent): Promise<void> {
    this.#onEvent(playerId, event);
  }
}

/**
 * A room that runs in the browser: the use cases of `@thelever-app/game` and `@thelever-app/dilemmas`
 * with in-memory adapters, and fake players that answer on timers. It speaks the same messages as the
 * room server (TSK-24), so the screen cannot tell them apart. Never for production.
 */
export class SimulatedRoomConnection implements RoomConnection {
  readonly #getGameState: GetGameStateUseCase;
  readonly #answerDilemma: AnswerDilemmaUseCase;
  readonly #gameId: string;
  readonly #playerId: string;
  readonly #language: string;
  readonly #listeners = new Set<ServerMessageListener>();
  readonly #timers: ReturnType<typeof setInterval>[] = [];

  private constructor(
    repositories: {
      readonly room: RoomRepository;
      readonly game: GameRepository;
      readonly catalog: DilemmaCatalog;
    },
    gameId: string,
    playerId: string,
    language: string,
  ) {
    this.#getGameState = new GetGameStateUseCase(
      repositories.room,
      repositories.game,
      repositories.catalog,
    );
    this.#answerDilemma = new AnswerDilemmaUseCase(
      repositories.game,
      new CallbackPlayerNotifier((to, event) => this.#onEvent(to, event)),
    );
    this.#gameId = gameId;
    this.#playerId = playerId;
    this.#language = language;
  }

  /** Composition root: stores the dilemmas, sets up the room, starts the decision phase and the fake players. */
  static async open(options: SimulatedRoomOptions): Promise<SimulatedRoomConnection> {
    const dilemmaRepository = new InMemoryDilemmaRepository();
    const dilemmaIdGenerator = new SequentialDilemmaIdGenerator('dilemma');
    const dilemmaIds: string[] = [];
    for (const { text, options: dilemmaOptions } of options.dilemmas) {
      const dilemma = Dilemma.create(
        { text, language: options.language, options: dilemmaOptions },
        dilemmaIdGenerator,
      );
      await dilemmaRepository.save(dilemma);
      dilemmaIds.push(dilemma.id);
    }
    const catalog = new DilemmasContextCatalog(new GetDilemmasUseCase(dilemmaRepository));

    const roomRepository = new InMemoryRoomRepository();
    const gameRepository = new InMemoryGameRepository();
    const idGenerator = new SequentialIdGenerator();
    const joinRoom = new JoinRoomUseCase(roomRepository, idGenerator);

    const { roomId, hostId } = await new CreateRoomUseCase(roomRepository, idGenerator).execute({
      hostNickname: options.nickname,
    });
    const otherIds: string[] = [];
    for (const { nickname } of options.others) {
      const { playerId } = await joinRoom.execute({ roomId, nickname });
      otherIds.push(playerId);
    }
    const { gameId } = await new StartDecisionPhaseUseCase(
      roomRepository,
      gameRepository,
      catalog,
      idGenerator,
    ).execute({ roomId, dilemmaIds });

    const connection = new SimulatedRoomConnection(
      { room: roomRepository, game: gameRepository, catalog },
      gameId,
      hostId,
      options.language,
    );
    const dilemmas = await catalog.findOptionIds(dilemmaIds);
    options.others.forEach(({ answerEveryMs }, index) => {
      connection.#startFakePlayer(otherIds[index]!, index, answerEveryMs, dilemmas);
    });
    return connection;
  }

  send(message: ClientMessageDto): void {
    const { dilemmaId, vote } = ClientMessageDto.parse(message);
    // Who answers and in which game come from the connection, never from the message.
    this.#answerDilemma
      .execute({ gameId: this.#gameId, playerId: this.#playerId, dilemmaId, vote })
      // The use case only tells the others: the player learns their own progress from a fresh state.
      .then(() => this.#sendState())
      .catch(console.error);
  }

  subscribe(listener: ServerMessageListener): () => void {
    this.#listeners.add(listener);
    // Like a server on connect: whoever subscribes gets the current state at once.
    this.#sendState(listener).catch(console.error);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  close(): void {
    this.#timers.forEach(clearInterval);
    this.#listeners.clear();
  }

  /** Fake player number `position` answers in order, each one with a different option so votes vary. */
  #startFakePlayer(
    playerId: string,
    position: number,
    answerEveryMs: number,
    dilemmas: readonly GameDilemma[],
  ): void {
    let next = 0;
    const timer = setInterval(() => {
      const dilemma = dilemmas[next];
      if (dilemma === undefined) {
        clearInterval(timer);
        return;
      }
      next += 1;
      const vote = dilemma.optionIds[position % dilemma.optionIds.length]!;
      this.#answerDilemma
        .execute({ gameId: this.#gameId, playerId, dilemmaId: dilemma.dilemmaId, vote })
        .catch(console.error);
    }, answerEveryMs);
    this.#timers.push(timer);
  }

  /** Sends the state to one listener, or to all of them. */
  async #sendState(listener?: ServerMessageListener): Promise<void> {
    const state = await this.#getGameState.execute({
      gameId: this.#gameId,
      playerId: this.#playerId,
      language: this.#language,
    });
    this.#emit(ServerMessageDto.parse({ type: 'game-state', ...state }), listener);
  }

  #onEvent(playerId: string, event: DomainEvent): void {
    if (playerId !== this.#playerId || !(event instanceof ProgressUpdatedEvent)) return;
    this.#emit(
      ServerMessageDto.parse({
        type: 'progress-updated',
        playerId: event.playerId,
        progress: event.progress,
      }),
    );
  }

  #emit(message: ServerMessageDto, only?: ServerMessageListener): void {
    for (const listener of only ? [only] : this.#listeners) listener(message);
  }
}
