import {
  AnswerDilemmaUseCase,
  ConnectionChangedEvent,
  ConnectPlayerUseCase,
  CreateRoomUseCase,
  DisconnectPlayerUseCase,
  GetGameStateUseCase,
  JoinRoomUseCase,
  ProgressUpdatedEvent,
  StartDecisionPhaseUseCase,
} from '@thelever-app/game';
import {
  InMemoryDilemmaCatalog,
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
/** Test data: the vote the driver changes to; the other option of every dilemma. */
const OTHER_VOTE = 'option-2';
/** Test data: every dilemma has two options, and VOTE is one of them. */
const CATALOG = new InMemoryDilemmaCatalog(
  DILEMMA_IDS.map((dilemmaId) => ({
    dilemmaId,
    text: `Text of ${dilemmaId}`,
    options: [
      { optionId: VOTE, text: 'Pull the lever' },
      { optionId: OTHER_VOTE, text: 'Do nothing' },
    ],
  })),
);

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
  readonly #getGameState: GetGameStateUseCase;
  readonly #connectPlayer: ConnectPlayerUseCase;
  readonly #disconnectPlayer: DisconnectPlayerUseCase;
  /** Kept with its concrete type to read what each player received. */
  readonly #notifier = new InMemoryPlayerNotifier();

  /** The scenario speaks in nicknames; the use cases, in ids. */
  readonly #playerIds = new Map<string, string>();
  /** The votes each player cast, in order, to look for them where they must not be. */
  readonly #votes = new Map<string, { readonly dilemmaId: string; readonly vote: string }[]>();
  /** The open connection of each player, as a socket of the room server would hold it. */
  readonly #connectionIds = new Map<string, string>();
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
      CATALOG,
      idGenerator,
    );
    this.#answerDilemma = new AnswerDilemmaUseCase(gameRepository, this.#notifier);
    this.#getGameState = new GetGameStateUseCase(roomRepository, gameRepository, CATALOG);
    this.#connectPlayer = new ConnectPlayerUseCase(
      roomRepository,
      gameRepository,
      this.#notifier,
      idGenerator,
    );
    this.#disconnectPlayer = new DisconnectPlayerUseCase(
      roomRepository,
      gameRepository,
      this.#notifier,
    );
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

    // Every player has the game open, as their device would after the phase starts.
    for (const player of this.#playerIds.keys()) {
      await this.reconnect(player);
    }
  }

  /** Answers the first `count` dilemmas of the game, in order. */
  async answerDilemmas(player: string, count: number): Promise<void> {
    for (const dilemmaId of DILEMMA_IDS.slice(0, count)) {
      await this.#answer(player, dilemmaId, VOTE);
    }
  }

  async changeVote(player: string, position: number): Promise<void> {
    const [previous] = (await this.votesCastFor(player, position)).slice(-1);
    if (!previous) throw new Error(`The scenario changes a vote ${player} never cast`);
    await this.#answer(player, this.#dilemmaIdAt(position), previous === VOTE ? OTHER_VOTE : VOTE);
  }

  async votesCastFor(player: string, position: number): Promise<string[]> {
    const dilemmaId = this.#dilemmaIdAt(position);
    return (this.#votes.get(player) ?? [])
      .filter((cast) => cast.dilemmaId === dilemmaId)
      .map(({ vote }) => vote);
  }

  async voteRecordedFor(player: string, position: number): Promise<string | undefined> {
    if (!this.#gameId) throw new Error('The scenario asks for a vote before the decision phase');
    const { answers } = await this.#getGameState.execute({
      gameId: this.#gameId,
      playerId: this.#playerIdOf(player),
      language: 'en',
    });
    return answers.find(({ dilemmaId }) => dilemmaId === this.#dilemmaIdAt(position))?.vote;
  }
  async votesRecordedFor(player: string): Promise<string[]> {
    const { answers } = await this.#stateOf(player);
    return answers.map(({ vote }) => vote);
  }

  async disconnect(player: string): Promise<void> {
    const connectionId = this.#connectionIds.get(player);
    if (!connectionId) throw new Error(`The scenario disconnects ${player}, who is not connected`);
    await this.#disconnectPlayer.execute({
      gameId: this.#currentGameId(),
      playerId: this.#playerIdOf(player),
      connectionId,
    });
    this.#connectionIds.delete(player);
  }

  async reconnect(player: string): Promise<void> {
    const { connectionId } = await this.#connectPlayer.execute({
      gameId: this.#currentGameId(),
      playerId: this.#playerIdOf(player),
    });
    this.#connectionIds.set(player, connectionId);
  }

  async dilemmaShownTo(player: string): Promise<number> {
    const { dilemmas, answers } = await this.#stateOf(player);
    const answered = new Set(answers.map(({ dilemmaId }) => dilemmaId));
    return dilemmas.findIndex(({ dilemmaId }) => !answered.has(dilemmaId)) + 1;
  }

  /** What `viewer` knows about the connection of `player`: the last change they received. */
  async connectionSeenBy(viewer: string, player: string): Promise<boolean | undefined> {
    const playerId = this.#playerIdOf(player);
    const changes = this.#notifier
      .receivedBy(this.#playerIdOf(viewer))
      .filter((event) => event instanceof ConnectionChangedEvent)
      .filter((event) => event.playerId === playerId);
    return changes.at(-1)?.connected;
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
    return (this.#votes.get(player) ?? []).map(({ vote }) => vote);
  }

  async #answer(player: string, dilemmaId: string, vote: string): Promise<void> {
    if (!this.#gameId) throw new Error('The scenario answers before the decision phase starts');
    const playerId = this.#playerIdOf(player);
    await this.#answerDilemma.execute({ gameId: this.#gameId, playerId, dilemmaId, vote });
    this.#votes.set(player, [...(this.#votes.get(player) ?? []), { dilemmaId, vote }]);
  }

  async #stateOf(player: string) {
    return this.#getGameState.execute({
      gameId: this.#currentGameId(),
      playerId: this.#playerIdOf(player),
      language: 'en',
    });
  }

  #currentGameId(): string {
    if (!this.#gameId) throw new Error('The scenario uses the game before the decision phase');
    return this.#gameId;
  }

  /** The scenario counts dilemmas from 1, as people do. */
  #dilemmaIdAt(position: number): string {
    const dilemmaId = DILEMMA_IDS[position - 1];
    if (!dilemmaId) throw new Error(`The game has no dilemma in position ${position}`);
    return dilemmaId;
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
