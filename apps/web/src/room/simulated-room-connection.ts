import {
  AnswerDilemmaUseCase,
  CreateRoomUseCase,
  GetGameStateUseCase,
  JoinRoomUseCase,
  ProgressUpdatedEvent,
  StartDecisionPhaseUseCase,
  type DomainEvent,
  type GameRepository,
  type PlayerNotifier,
  type RoomRepository,
} from '@thelever-app/game';
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
  /** Fake players: each one answers the next dilemma every `answerEveryMs`. */
  readonly others: readonly { readonly nickname: string; readonly answerEveryMs: number }[];
  /** In the order every player gets them. */
  readonly dilemmaIds: readonly string[];
  /** The vote every fake player casts. */
  readonly vote: string;
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
 * A room that runs in the browser: the use cases of `@thelever-app/game` with in-memory adapters,
 * and fake players that answer on timers. It speaks the same messages as the room server (TSK-24),
 * so the screen cannot tell them apart. Never for production.
 */
export class SimulatedRoomConnection implements RoomConnection {
  readonly #getGameState: GetGameStateUseCase;
  readonly #answerDilemma: AnswerDilemmaUseCase;
  readonly #gameId: string;
  readonly #playerId: string;
  readonly #listeners = new Set<ServerMessageListener>();
  readonly #timers: ReturnType<typeof setInterval>[] = [];

  private constructor(
    roomRepository: RoomRepository,
    gameRepository: GameRepository,
    gameId: string,
    playerId: string,
  ) {
    this.#getGameState = new GetGameStateUseCase(roomRepository, gameRepository);
    this.#answerDilemma = new AnswerDilemmaUseCase(
      gameRepository,
      new CallbackPlayerNotifier((to, event) => this.#onEvent(to, event)),
    );
    this.#gameId = gameId;
    this.#playerId = playerId;
  }

  /** Composition root: sets up the room, starts the decision phase and the fake players. */
  static async open(options: SimulatedRoomOptions): Promise<SimulatedRoomConnection> {
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
      idGenerator,
    ).execute({ roomId, dilemmaIds: options.dilemmaIds });

    const connection = new SimulatedRoomConnection(roomRepository, gameRepository, gameId, hostId);
    options.others.forEach(({ answerEveryMs }, index) => {
      connection.#startFakePlayer(otherIds[index]!, answerEveryMs, options);
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

  #startFakePlayer(
    playerId: string,
    answerEveryMs: number,
    { dilemmaIds, vote }: SimulatedRoomOptions,
  ): void {
    let next = 0;
    const timer = setInterval(() => {
      const dilemmaId = dilemmaIds[next];
      if (dilemmaId === undefined) {
        clearInterval(timer);
        return;
      }
      next += 1;
      this.#answerDilemma
        .execute({ gameId: this.#gameId, playerId, dilemmaId, vote })
        .catch(console.error);
    }, answerEveryMs);
    this.#timers.push(timer);
  }

  /** Sends the state to one listener, or to all of them. */
  async #sendState(listener?: ServerMessageListener): Promise<void> {
    const state = await this.#getGameState.execute({
      gameId: this.#gameId,
      playerId: this.#playerId,
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
