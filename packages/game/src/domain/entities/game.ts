import { AnswerIncompleteError } from '../errors/answer-incomplete.error.ts';
import { DecisionPhaseAlreadyStartedError } from '../errors/decision-phase-already-started.error.ts';
import { DecisionPhaseNotStartedError } from '../errors/decision-phase-not-started.error.ts';
import { DecisionPhaseOverError } from '../errors/decision-phase-over.error.ts';
import { DilemmaAlreadyReportedError } from '../errors/dilemma-already-reported.error.ts';
import { DilemmaNotInGameError } from '../errors/dilemma-not-in-game.error.ts';
import { DilemmaNotReportedAsOffensiveError } from '../errors/dilemma-not-reported-as-offensive.error.ts';
import { DilemmaNotReachedError } from '../errors/dilemma-not-reached.error.ts';
import { DilemmaSkippedError } from '../errors/dilemma-skipped.error.ts';
import { DilemmasMissingError } from '../errors/dilemmas-missing.error.ts';
import { DuplicateDilemmaError } from '../errors/duplicate-dilemma.error.ts';
import { DuplicateVotePredictionError } from '../errors/duplicate-vote-prediction.error.ts';
import { InvalidMatchPredictionError } from '../errors/invalid-match-prediction.error.ts';
import { OptionNotInDilemmaError } from '../errors/option-not-in-dilemma.error.ts';
import { PlayerNotInGameError } from '../errors/player-not-in-game.error.ts';
import { PlayerNotInPredictionSubsetError } from '../errors/player-not-in-prediction-subset.error.ts';
import { PlayersMissingError } from '../errors/players-missing.error.ts';
import { PredictionsNotAllowedError } from '../errors/predictions-not-allowed.error.ts';
import type { DomainEvent } from '../events/domain-event.ts';
import { ProgressUpdatedEvent } from '../events/progress-updated.event.ts';
import { RevealStartedEvent } from '../events/reveal-started.event.ts';
import { TotalTimeRanOutEvent } from '../events/total-time-ran-out.event.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import type { Randomness } from '../ports/randomness.port.ts';
import type { DilemmaOrigin } from '../services/compose-game.ts';
import { peopleInTheGap } from '../services/people-in-the-gap.ts';
import { predictionSubsets } from '../services/prediction-subsets.ts';
import { shuffle } from '../services/random-choice.ts';
import { scorePredictions, type PredictionPoints } from '../services/score-predictions.ts';
import { AnswerVO, type AnswerProps, type Seal, type VotePrediction } from '../vos/answer.vo.ts';
import { DilemmaVO } from '../vos/dilemma.vo.ts';
import type { GroupNature, Place } from '../vos/group.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { VoteVO } from '../vos/vote.vo.ts';
import type { DilemmaLanguage, RoomVariant, TotalTimeInMinutes } from '../vos/room-settings.vo.ts';
import type { Player } from './player.ts';

/** A dilemma of the game: its id, the version played, the ids of its options and whether it has the gap. */
export interface GameDilemma {
  readonly dilemmaId: string;
  readonly version: number;
  readonly optionIds: readonly string[];
  readonly hasGap: boolean;
}

/** A dilemma as the game plays it: what the catalog gives, and how it got into the game. */
export interface PlayedDilemma extends GameDilemma {
  readonly origin: DilemmaOrigin;
}

/** What the game copies from its room when it starts, and keeps even if the room changes. */
export interface GameSettings {
  readonly variant: RoomVariant;
  readonly groupNature: GroupNature;
  readonly place: Place;
  readonly dilemmaLanguage: DilemmaLanguage;
  readonly totalTimeInMinutes: TotalTimeInMinutes;
}

/** The decision phase, until the reveal; then the reveal. */
export type GamePhase = 'decision' | 'reveal';

/** Why a dilemma is recorded as "did not vote": unanswered when the reveal started, or skipped by reporting it. */
export type DidNotVoteReason = 'not-answered' | 'reported';

/** What a player answers of a dilemma, complete or not yet: the vote and the predictions made so far. */
export interface AnswerDraft {
  readonly vote: string;
  readonly matchPrediction?: number | null;
  readonly votePredictions?: readonly VotePrediction[];
}

export interface GameSnapshot {
  readonly id: string;
  readonly roomId: string;
  readonly dilemmas: readonly PlayedDilemma[];
  readonly settings: GameSettings;
  readonly phase: GamePhase | null;
  readonly version: number;
  readonly totalTime: {
    readonly startedAt: Date;
    readonly endsAt: Date;
    readonly ranOut: boolean;
  } | null;
  readonly peopleInTheGap: readonly { readonly dilemmaId: string; readonly playerId: string }[];
  readonly players: readonly {
    readonly id: string;
    readonly left: boolean;
    /** When the player got the dilemma they are on; null once they have none left. */
    readonly currentSince: Date | null;
    /** The options of each dilemma in the order the player sees them. */
    readonly optionOrders: readonly {
      readonly dilemmaId: string;
      readonly optionOrder: readonly string[];
    }[];
    /** The players whose vote they predict in each dilemma; none in an anonymous room. */
    readonly predictionSubsets: readonly {
      readonly dilemmaId: string;
      readonly predictionSubset: readonly string[];
    }[];
    readonly answers: readonly ({ readonly dilemmaId: string } & AnswerProps)[];
    readonly didNotVote: readonly {
      readonly dilemmaId: string;
      readonly reason: DidNotVoteReason;
    }[];
    readonly points: readonly ({ readonly dilemmaId: string } & PredictionPoints)[];
    /** The dilemmas the player reported, and whether as offensive, which lets them skip it. */
    readonly reports: readonly { readonly dilemmaId: string; readonly offensive: boolean }[];
  }[];
}

interface PlayerState {
  readonly optionOrders: Map<string, readonly string[]>;
  readonly predictionSubsets: Map<string, readonly string[]>;
  readonly answers: Map<string, AnswerVO>;
  readonly didNotVote: Map<string, DidNotVoteReason>;
  readonly points: Map<string, PredictionPoints>;
  /** Whether each dilemma the player reported was offensive. */
  readonly reports: Map<string, boolean>;
  currentSince: Date | null;
  left: boolean;
}

const MS_PER_MINUTE = 60_000;

export class Game {
  readonly #id: IdVO;
  readonly #roomId: IdVO;
  readonly #dilemmas: readonly DilemmaVO[];
  readonly #origins: ReadonlyMap<string, DilemmaOrigin>;
  readonly #settings: GameSettings;
  #phase: GamePhase | null = null;
  /** Goes up with every change, so the clients can drop what is older than what they hold. */
  #version = 0;
  #totalTime: { startedAt: Date; endsAt: Date; ranOut: boolean } | null = null;
  #peopleInTheGap = new Map<string, string>();
  /** In the order of the players of the decision phase. */
  readonly #players = new Map<string, PlayerState>();
  #events: DomainEvent[] = [];

  private constructor(
    id: string,
    roomId: string,
    dilemmas: readonly PlayedDilemma[],
    settings: GameSettings,
  ) {
    if (dilemmas.length === 0) throw new DilemmasMissingError();
    const ids = dilemmas.map(({ dilemmaId }) => dilemmaId);
    const repeated = ids.find((dilemmaId, index) => ids.indexOf(dilemmaId) !== index);
    if (repeated !== undefined) throw new DuplicateDilemmaError(repeated);

    this.#id = new IdVO(id);
    this.#roomId = new IdVO(roomId);
    this.#dilemmas = dilemmas.map(
      ({ dilemmaId, version, optionIds, hasGap }) =>
        new DilemmaVO(dilemmaId, version, optionIds, hasGap),
    );
    this.#origins = new Map(dilemmas.map(({ dilemmaId, origin }) => [dilemmaId, origin]));
    this.#settings = { ...settings };
  }

  static create(
    {
      roomId,
      dilemmas,
      settings,
    }: {
      readonly roomId: string;
      readonly dilemmas: readonly PlayedDilemma[];
      readonly settings: GameSettings;
    },
    idGenerator: IdGenerator,
  ): Game {
    return new Game(idGenerator.generate(), roomId, dilemmas, settings);
  }

  get id(): string {
    return this.#id.value;
  }

  get roomId(): string {
    return this.#roomId.value;
  }

  /** In the order every player gets them. */
  get dilemmas(): readonly PlayedDilemma[] {
    return this.#dilemmas.map(({ dilemmaId, version, optionIds, hasGap }) => ({
      dilemmaId,
      version,
      optionIds,
      hasGap,
      origin: this.#origins.get(dilemmaId) as DilemmaOrigin,
    }));
  }

  get settings(): GameSettings {
    return { ...this.#settings };
  }

  get playerIds(): readonly string[] {
    return [...this.#players.keys()];
  }

  get phase(): GamePhase | null {
    return this.#phase;
  }

  get isInDecisionPhase(): boolean {
    return this.#phase === 'decision';
  }

  get version(): number {
    return this.#version;
  }

  /** When the total time of the decision phase runs out; null before it starts. */
  get totalTimeEndsAt(): Date | null {
    return this.#totalTime && new Date(this.#totalTime.endsAt);
  }

  get totalTimeRanOut(): boolean {
    return this.#totalTime?.ranOut ?? false;
  }

  /**
   * Everyone gets the dilemmas in the same order. Each player gets the options of each dilemma in
   * an order of their own and, in a nominal room, their prediction subset; each dilemma with the
   * gap gets its person. The total time starts now.
   */
  startDecisionPhase(players: readonly Player[], at: Date, randomness: Randomness): void {
    if (this.#phase !== null) throw new DecisionPhaseAlreadyStartedError();
    if (players.length === 0) throw new PlayersMissingError();

    const playerIds = players.map(({ id }) => id);
    const subsets =
      this.#settings.variant === 'nominal'
        ? predictionSubsets(playerIds, this.#dilemmas.length, randomness)
        : new Map<string, string[][]>();
    for (const playerId of playerIds) {
      this.#players.set(playerId, {
        optionOrders: new Map(
          this.#dilemmas.map((dilemma) => [
            dilemma.dilemmaId,
            shuffle(dilemma.optionIds, randomness),
          ]),
        ),
        predictionSubsets: new Map(
          this.#dilemmas.map((dilemma, position) => [
            dilemma.dilemmaId,
            subsets.get(playerId)?.[position] ?? [],
          ]),
        ),
        answers: new Map(),
        didNotVote: new Map(),
        points: new Map(),
        reports: new Map(),
        currentSince: new Date(at),
        left: false,
      });
    }
    this.#peopleInTheGap = peopleInTheGap(
      this.#dilemmas.filter(({ hasGap }) => hasGap).map(({ dilemmaId }) => dilemmaId),
      playerIds,
      randomness,
    );
    const endsAt = new Date(at.getTime() + this.#settings.totalTimeInMinutes * MS_PER_MINUTE);
    this.#totalTime = { startedAt: new Date(at), endsAt, ranOut: false };
    this.#phase = 'decision';
    this.#version += 1;
  }

  /**
   * The player answers the dilemma they are on, or changes one they completed. A complete answer
   * is the vote in an anonymous room, and the vote with every prediction in a nominal one; only a
   * complete answer raises their progress and takes them to the next dilemma. The seal is the one
   * in force now, also when the player changes an answer.
   */
  answer(playerId: string, dilemmaId: string, draft: AnswerDraft, seal: Seal, at: Date): void {
    this.#ensureDecisionPhase();
    const state = this.#stateOf(playerId);
    const dilemma = this.#dilemmaOf(dilemmaId);
    const vote = new VoteVO(draft.vote).value;
    if (state.didNotVote.has(dilemmaId)) throw new DilemmaSkippedError(dilemmaId);
    const previous = state.answers.get(dilemmaId);
    const wasComplete = previous !== undefined && this.#isComplete(playerId, dilemmaId, previous);
    if (!wasComplete && dilemma !== this.#currentOf(playerId)) {
      throw new DilemmaNotReachedError(dilemmaId);
    }
    if (!dilemma.hasOption(vote)) throw new OptionNotInDilemmaError(vote, dilemmaId);
    const matchPrediction = draft.matchPrediction ?? null;
    const votePredictions = draft.votePredictions ?? [];
    this.#ensurePredictionsFit(
      dilemma,
      this.predictionSubsetOf(playerId, dilemmaId),
      matchPrediction,
      votePredictions,
    );

    let answer = new AnswerVO({
      vote,
      matchPrediction,
      votePredictions,
      optionOrder: this.optionOrderOf(playerId, dilemmaId),
      responseTimeMs: previous?.responseTimeMs ?? null,
      seal,
      voterInTheGap: this.#peopleInTheGap.get(dilemmaId) === playerId,
    });
    const isComplete = this.#isComplete(playerId, dilemmaId, answer);
    if (wasComplete && !isComplete) throw new AnswerIncompleteError(dilemmaId);

    const progressBefore = this.progressOf(playerId);
    if (isComplete && !wasComplete) {
      answer = answer.completedIn(at.getTime() - (state.currentSince as Date).getTime());
      state.answers.set(dilemmaId, answer);
      state.currentSince = this.#currentOf(playerId) ? new Date(at) : null;
    } else {
      state.answers.set(dilemmaId, answer);
    }
    this.#version += 1;
    this.#afterProgress(playerId, progressBefore);
  }

  /**
   * The player reported a dilemma of the game, once. Reported as offensive, they may skip it; the
   * report itself is for Moderation.
   */
  recordReport(playerId: string, dilemmaId: string, offensive: boolean): void {
    this.#ensureDecisionPhase();
    const state = this.#stateOf(playerId);
    this.#dilemmaOf(dilemmaId);
    if (state.reports.has(dilemmaId)) throw new DilemmaAlreadyReportedError(dilemmaId);

    state.reports.set(dilemmaId, offensive);
    this.#version += 1;
  }

  /** The dilemmas the player reported, in the order of the dilemmas. */
  reportsOf(
    playerId: string,
  ): readonly { readonly dilemmaId: string; readonly offensive: boolean }[] {
    const { reports } = this.#stateOf(playerId);
    return this.#dilemmas.flatMap(({ dilemmaId }) => {
      const offensive = reports.get(dilemmaId);
      return offensive === undefined ? [] : [{ dilemmaId, offensive }];
    });
  }

  /**
   * The player skips the dilemma they are on, which they reported as offensive: it is recorded as
   * "did not vote" and counts as progress, and they cannot come back to it.
   */
  skip(playerId: string, dilemmaId: string, at: Date): void {
    this.#ensureDecisionPhase();
    const state = this.#stateOf(playerId);
    const dilemma = this.#dilemmaOf(dilemmaId);
    if (state.didNotVote.has(dilemmaId)) return;
    if (state.reports.get(dilemmaId) !== true) {
      throw new DilemmaNotReportedAsOffensiveError(dilemmaId);
    }
    if (dilemma !== this.#currentOf(playerId)) throw new DilemmaNotReachedError(dilemmaId);

    const progressBefore = this.progressOf(playerId);
    state.answers.delete(dilemmaId);
    state.didNotVote.set(dilemmaId, 'reported');
    state.currentSince = this.#currentOf(playerId) ? new Date(at) : null;
    this.#version += 1;
    this.#afterProgress(playerId, progressBefore);
  }

  /**
   * Once the total time is over, the game records it and tells everyone who had not finished; it
   * goes on. It does nothing before the time is over, after the decision phase or a second time,
   * so anyone may call it whenever they find the time over.
   */
  runOutTotalTime(at: Date): boolean {
    if (this.#phase !== 'decision' || !this.#totalTime || this.#totalTime.ranOut) return false;
    if (at.getTime() < this.#totalTime.endsAt.getTime()) return false;

    this.#totalTime.ranOut = true;
    this.#version += 1;
    this.#events.push(new TotalTimeRanOutEvent(this.id, this.stragglerIds, this.#version));
    return true;
  }

  /**
   * The decision phase ends: whatever a player did not vote is recorded as "did not vote", and in
   * a nominal room the predictions made are scored. Who may start it is up to the room.
   */
  startReveal(): void {
    this.#ensureDecisionPhase();
    for (const state of this.#players.values()) {
      for (const { dilemmaId } of this.#dilemmas) {
        if (!state.answers.has(dilemmaId) && !state.didNotVote.has(dilemmaId)) {
          state.didNotVote.set(dilemmaId, 'not-answered');
        }
      }
      state.currentSince = null;
    }
    if (this.#settings.variant === 'nominal') this.#score();
    this.#phase = 'reveal';
    this.#version += 1;
    this.#events.push(new RevealStartedEvent(this.id, this.#version));
  }

  /** The player leaves on purpose: they keep their answers, and nobody waits for them any more. */
  leave(playerId: string): void {
    const state = this.#stateOf(playerId);
    if (state.left) return;
    state.left = true;
    this.#version += 1;
    if (this.#phase === 'decision' && this.#everyoneFinished()) this.startReveal();
  }

  /** A player who had left comes back to the game where they were. */
  rejoin(playerId: string): void {
    const state = this.#stateOf(playerId);
    if (!state.left) return;
    state.left = false;
    this.#version += 1;
  }

  hasLeft(playerId: string): boolean {
    return this.#stateOf(playerId).left;
  }

  /** How many dilemmas the player has completed or skipped. It never goes down. */
  progressOf(playerId: string): number {
    const state = this.#stateOf(playerId);
    return this.#dilemmas.filter(
      ({ dilemmaId }) =>
        state.didNotVote.get(dilemmaId) === 'reported' || this.#isCompleted(playerId, dilemmaId),
    ).length;
  }

  hasFinished(playerId: string): boolean {
    return this.progressOf(playerId) === this.#dilemmas.length;
  }

  /** Whether everyone who has not left, but that player, has finished. */
  everyoneElseFinished(playerId: string): boolean {
    return this.#activePlayerIds().every((id) => id === playerId || this.hasFinished(id));
  }

  /** The players who have not left and have not finished. */
  get stragglerIds(): readonly string[] {
    return this.#activePlayerIds().filter((playerId) => !this.hasFinished(playerId));
  }

  /** The options of the dilemma in the order the player sees them. */
  optionOrderOf(playerId: string, dilemmaId: string): readonly string[] {
    this.#dilemmaOf(dilemmaId);
    return [...(this.#stateOf(playerId).optionOrders.get(dilemmaId) as readonly string[])];
  }

  /** The players whose vote the player predicts in the dilemma; none in an anonymous room. */
  predictionSubsetOf(playerId: string, dilemmaId: string): readonly string[] {
    this.#dilemmaOf(dilemmaId);
    return [...(this.#stateOf(playerId).predictionSubsets.get(dilemmaId) as readonly string[])];
  }

  /** The player whose nickname takes the gap of the dilemma, the same for everyone; null without a gap. */
  personInTheGap(dilemmaId: string): string | null {
    this.#dilemmaOf(dilemmaId);
    return this.#peopleInTheGap.get(dilemmaId) ?? null;
  }

  /** The answers of one player, in the order of the dilemmas. Who may see them is up to the caller. */
  answersOf(playerId: string): readonly ({ readonly dilemmaId: string } & AnswerProps)[] {
    const { answers } = this.#stateOf(playerId);
    return this.#dilemmas.flatMap(({ dilemmaId }) => {
      const answer = answers.get(dilemmaId);
      return answer ? [{ dilemmaId, ...answer.toProps() }] : [];
    });
  }

  /** The dilemmas recorded as "did not vote" for the player, in the order of the dilemmas. */
  didNotVoteOf(
    playerId: string,
  ): readonly { readonly dilemmaId: string; readonly reason: DidNotVoteReason }[] {
    const { didNotVote } = this.#stateOf(playerId);
    return this.#dilemmas.flatMap(({ dilemmaId }) => {
      const reason = didNotVote.get(dilemmaId);
      return reason ? [{ dilemmaId, reason }] : [];
    });
  }

  /** What the predictions of the player scored in each dilemma; empty until the reveal starts. */
  pointsOf(playerId: string): readonly ({ readonly dilemmaId: string } & PredictionPoints)[] {
    const { points } = this.#stateOf(playerId);
    return this.#dilemmas.flatMap(({ dilemmaId }) => {
      const scored = points.get(dilemmaId);
      return scored ? [{ dilemmaId, ...scored }] : [];
    });
  }

  /** Returns the events recorded since the last call and forgets them. */
  pullEvents(): DomainEvent[] {
    const events = this.#events;
    this.#events = [];
    return events;
  }

  toSnapshot(): GameSnapshot {
    return {
      id: this.id,
      roomId: this.roomId,
      dilemmas: this.dilemmas,
      settings: this.settings,
      phase: this.#phase,
      version: this.#version,
      totalTime: this.#totalTime && {
        startedAt: new Date(this.#totalTime.startedAt),
        endsAt: new Date(this.#totalTime.endsAt),
        ranOut: this.#totalTime.ranOut,
      },
      peopleInTheGap: [...this.#peopleInTheGap].map(([dilemmaId, playerId]) => ({
        dilemmaId,
        playerId,
      })),
      players: [...this.#players].map(([playerId, state]) => ({
        id: playerId,
        left: state.left,
        currentSince: state.currentSince && new Date(state.currentSince),
        optionOrders: [...state.optionOrders].map(([dilemmaId, optionOrder]) => ({
          dilemmaId,
          optionOrder: [...optionOrder],
        })),
        predictionSubsets: [...state.predictionSubsets].map(([dilemmaId, predictionSubset]) => ({
          dilemmaId,
          predictionSubset: [...predictionSubset],
        })),
        answers: this.answersOf(playerId),
        didNotVote: this.didNotVoteOf(playerId),
        points: this.pointsOf(playerId),
        reports: this.reportsOf(playerId),
      })),
    };
  }

  static restore(snapshot: GameSnapshot): Game {
    const game = new Game(snapshot.id, snapshot.roomId, snapshot.dilemmas, snapshot.settings);
    game.#phase = snapshot.phase;
    game.#version = snapshot.version;
    game.#totalTime = snapshot.totalTime && {
      startedAt: new Date(snapshot.totalTime.startedAt),
      endsAt: new Date(snapshot.totalTime.endsAt),
      ranOut: snapshot.totalTime.ranOut,
    };
    game.#peopleInTheGap = new Map(
      snapshot.peopleInTheGap.map(({ dilemmaId, playerId }) => [dilemmaId, playerId]),
    );
    for (const player of snapshot.players) {
      game.#players.set(player.id, {
        optionOrders: new Map(
          player.optionOrders.map(({ dilemmaId, optionOrder }) => [dilemmaId, [...optionOrder]]),
        ),
        predictionSubsets: new Map(
          player.predictionSubsets.map(({ dilemmaId, predictionSubset }) => [
            dilemmaId,
            [...predictionSubset],
          ]),
        ),
        answers: new Map(
          player.answers.map(({ dilemmaId, ...props }) => [dilemmaId, new AnswerVO(props)]),
        ),
        didNotVote: new Map(player.didNotVote.map(({ dilemmaId, reason }) => [dilemmaId, reason])),
        points: new Map(
          player.points.map(({ dilemmaId, match, votes }) => [dilemmaId, { match, votes }]),
        ),
        reports: new Map(player.reports.map(({ dilemmaId, offensive }) => [dilemmaId, offensive])),
        currentSince: player.currentSince && new Date(player.currentSince),
        left: player.left,
      });
    }
    return game;
  }

  #ensureDecisionPhase(): void {
    if (this.#phase === null) throw new DecisionPhaseNotStartedError();
    if (this.#phase === 'reveal') throw new DecisionPhaseOverError();
  }

  #stateOf(playerId: string): PlayerState {
    const state = this.#players.get(playerId);
    if (!state) throw new PlayerNotInGameError(playerId);
    return state;
  }

  #dilemmaOf(dilemmaId: string): DilemmaVO {
    const dilemma = this.#dilemmas.find((candidate) => candidate.dilemmaId === dilemmaId);
    if (!dilemma) throw new DilemmaNotInGameError(dilemmaId);
    return dilemma;
  }

  /** The dilemma the player is on: the first one they have neither completed nor skipped. */
  #currentOf(playerId: string): DilemmaVO | undefined {
    const state = this.#stateOf(playerId);
    return this.#dilemmas.find(
      ({ dilemmaId }) =>
        !state.didNotVote.has(dilemmaId) && !this.#isCompleted(playerId, dilemmaId),
    );
  }

  #isCompleted(playerId: string, dilemmaId: string): boolean {
    const answer = this.#stateOf(playerId).answers.get(dilemmaId);
    return answer !== undefined && this.#isComplete(playerId, dilemmaId, answer);
  }

  /** The vote in an anonymous room; the vote with every prediction in a nominal one. */
  #isComplete(playerId: string, dilemmaId: string, answer: AnswerVO): boolean {
    if (this.#settings.variant === 'anonymous') return true;
    const predictionSubset = this.predictionSubsetOf(playerId, dilemmaId);
    const predicted = new Set(answer.votePredictions.map((prediction) => prediction.playerId));
    return (
      answer.matchPrediction !== null && predictionSubset.every((other) => predicted.has(other))
    );
  }

  #ensurePredictionsFit(
    dilemma: DilemmaVO,
    predictionSubset: readonly string[],
    matchPrediction: number | null,
    votePredictions: readonly VotePrediction[],
  ): void {
    if (this.#settings.variant === 'anonymous') {
      if (matchPrediction !== null || votePredictions.length > 0) {
        throw new PredictionsNotAllowedError();
      }
      return;
    }
    const otherPlayers = this.#players.size - 1;
    if (
      matchPrediction !== null &&
      (!Number.isInteger(matchPrediction) || matchPrediction < 0 || matchPrediction > otherPlayers)
    ) {
      throw new InvalidMatchPredictionError(matchPrediction, otherPlayers);
    }
    const seen = new Set<string>();
    for (const { playerId, vote } of votePredictions) {
      if (!predictionSubset.includes(playerId)) {
        throw new PlayerNotInPredictionSubsetError(playerId, dilemma.dilemmaId);
      }
      if (seen.has(playerId)) throw new DuplicateVotePredictionError(playerId);
      seen.add(playerId);
      if (!dilemma.hasOption(vote.trim())) {
        throw new OptionNotInDilemmaError(vote, dilemma.dilemmaId);
      }
    }
  }

  #afterProgress(playerId: string, progressBefore: number): void {
    const progress = this.progressOf(playerId);
    if (progress > progressBefore) {
      this.#events.push(new ProgressUpdatedEvent(this.id, playerId, progress, this.#version));
    }
    if (this.#everyoneFinished()) this.startReveal();
  }

  #activePlayerIds(): string[] {
    return [...this.#players].filter(([, state]) => !state.left).map(([playerId]) => playerId);
  }

  #everyoneFinished(): boolean {
    return this.#activePlayerIds().every((playerId) => this.hasFinished(playerId));
  }

  #score(): void {
    const playerIds = this.playerIds;
    for (const { dilemmaId } of this.#dilemmas) {
      const points = scorePredictions({
        playerIds,
        answerOf: (playerId) => this.#stateOf(playerId).answers.get(dilemmaId),
        subsetOf: (playerId) => this.predictionSubsetOf(playerId, dilemmaId),
      });
      for (const [playerId, scored] of points) {
        this.#stateOf(playerId).points.set(dilemmaId, scored);
      }
    }
  }
}
