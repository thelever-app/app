import {
  AnswerDilemmaUseCase,
  CreateRoomUseCase,
  JoinRoomUseCase,
  ProgressUpdatedEvent,
  StartDecisionPhaseUseCase,
} from '@thelever-app/game';
import {
  InMemoryGameRepository,
  InMemoryPlayerNotifier,
  InMemoryRoomRepository,
  SequentialIdGenerator,
} from '@thelever-app/game/in-memory';
import type { GameDriver } from './driver.ts';

/** Test data: enough dilemmas for any scenario of CU-04 that counts answers. */
const DILEMMA_IDS = ['dilemma-1', 'dilemma-2', 'dilemma-3', 'dilemma-4', 'dilemma-5', 'dilemma-6'];
/** Test data: the vote the driver casts when a step does not say which one. */
const VOTE = 'option-1';

/**
 * Drives the application layer of the Game context with in-memory adapters.
 * No browser, no network, no database.
 *
 * It is the composition root of the scenario: it decides which adapter sits behind each port.
 * Cucumber builds a new World, and so a new driver, for every scenario, so nothing leaks between them.
 */
export class AcceptanceDriver implements GameDriver {
  readonly #createRoom: CreateRoomUseCase;
  readonly #joinRoom: JoinRoomUseCase;
  readonly #startDecisionPhase: StartDecisionPhaseUseCase;
  readonly #answerDilemma: AnswerDilemmaUseCase;
  /** Kept with its concrete type to read what each player received. */
  readonly #notifier = new InMemoryPlayerNotifier();

  /** The scenario speaks in nicknames; the use cases, in ids. */
  readonly #playerIds = new Map<string, string>();
  /** The votes each player cast, to check that nobody else receives them. */
  readonly #votes = new Map<string, string[]>();
  #roomId: string | undefined;
  #gameId: string | undefined;

  constructor() {
    const roomRepository = new InMemoryRoomRepository();
    const gameRepository = new InMemoryGameRepository();
    const idGenerator = new SequentialIdGenerator();

    this.#createRoom = new CreateRoomUseCase(roomRepository, idGenerator);
    this.#joinRoom = new JoinRoomUseCase(roomRepository, idGenerator);
    this.#startDecisionPhase = new StartDecisionPhaseUseCase(
      roomRepository,
      gameRepository,
      idGenerator,
    );
    this.#answerDilemma = new AnswerDilemmaUseCase(gameRepository, this.#notifier);
  }

  async start(): Promise<void> {
    // Nothing to prepare: the constructor already built a fresh set of adapters for this scenario.
  }

  async stop(): Promise<void> {
    // Nothing to release: everything lives in memory.
  }

  async hostRoom(host: string, players: string[]): Promise<void> {
    const { roomId, hostId } = await this.#createRoom.execute({ hostNickname: host });
    this.#roomId = roomId;
    this.#playerIds.set(host, hostId);

    for (const nickname of players) {
      const { playerId } = await this.#joinRoom.execute({ roomId, nickname });
      this.#playerIds.set(nickname, playerId);
    }
  }

  async startDecisionPhase(): Promise<void> {
    if (!this.#roomId) throw new Error('The scenario starts the decision phase without a room');

    const { gameId } = await this.#startDecisionPhase.execute({
      roomId: this.#roomId,
      dilemmaIds: DILEMMA_IDS,
    });
    this.#gameId = gameId;
  }

  /** Answers the first `count` dilemmas of the game, in order. */
  async answerDilemmas(player: string, count: number): Promise<void> {
    if (!this.#gameId) throw new Error('The scenario answers before the decision phase starts');
    const playerId = this.#playerIdOf(player);

    for (const dilemmaId of DILEMMA_IDS.slice(0, count)) {
      await this.#answerDilemma.execute({ gameId: this.#gameId, playerId, dilemmaId, vote: VOTE });
      this.#votes.set(player, [...(this.#votes.get(player) ?? []), VOTE]);
    }
  }
  /** What `viewer` knows about the progress of `player`: the last update they received. */
  async progressSeenBy(viewer: string, player: string): Promise<number | undefined> {
    const updates = this.#progressUpdatesAbout(player, this.#playerIdOf(viewer));
    return updates.at(-1)?.progress;
  }

  /** Everything every other player received, of any kind and about anyone. */
  async messagesReceivedByOthers(player: string): Promise<object[]> {
    const playerId = this.#playerIdOf(player);
    const otherPlayerIds = [...this.#playerIds.values()].filter((id) => id !== playerId);
    return otherPlayerIds.flatMap((id) => this.#notifier.receivedBy(id));
  }

  async votesCastBy(player: string): Promise<string[]> {
    return this.#votes.get(player) ?? [];
  }

  /** The events are the instances the use case sent, so `instanceof` tells their type. */
  #progressUpdatesAbout(player: string, receiverId: string): ProgressUpdatedEvent[] {
    const playerId = this.#playerIdOf(player);
    return this.#notifier
      .receivedBy(receiverId)
      .filter((event) => event instanceof ProgressUpdatedEvent)
      .filter((event) => event.playerId === playerId);
  }

  /** A nickname that no step introduced is a mistake in the scenario, not in the game. */
  #playerIdOf(nickname: string): string {
    const playerId = this.#playerIds.get(nickname);
    if (!playerId) throw new Error(`No player called "${nickname}" in this scenario`);
    return playerId;
  }
}
