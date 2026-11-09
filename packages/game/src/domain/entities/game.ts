import { AnswerIncompleteError } from '../errors/answer-incomplete.error.ts';
import { DecisionPhaseAlreadyStartedError } from '../errors/decision-phase-already-started.error.ts';
import { DecisionPhaseNotStartedError } from '../errors/decision-phase-not-started.error.ts';
import { DecisionPhaseOverError } from '../errors/decision-phase-over.error.ts';
import { DilemmaAlreadyReportedError } from '../errors/dilemma-already-reported.error.ts';
import { DilemmaNotInGameError } from '../errors/dilemma-not-in-game.error.ts';
import { DilemmaNotInRoundError } from '../errors/dilemma-not-in-round.error.ts';
import { DilemmaNotReportedAsOffensiveError } from '../errors/dilemma-not-reported-as-offensive.error.ts';
import { DilemmaNotRevealedError } from '../errors/dilemma-not-revealed.error.ts';
import { DilemmaSkippedError } from '../errors/dilemma-skipped.error.ts';
import { DilemmasMissingError } from '../errors/dilemmas-missing.error.ts';
import { DuplicateDilemmaError } from '../errors/duplicate-dilemma.error.ts';
import { DuplicateVotePredictionError } from '../errors/duplicate-vote-prediction.error.ts';
import { NoNextRoundError } from '../errors/no-next-round.error.ts';
import { OptionNotInDilemmaError } from '../errors/option-not-in-dilemma.error.ts';
import { PlayerLeftGameError } from '../errors/player-left-game.error.ts';
import { PlayerNotInGameError } from '../errors/player-not-in-game.error.ts';
import { PlayerNotPredictableError } from '../errors/player-not-predictable.error.ts';
import { PlayersMissingError } from '../errors/players-missing.error.ts';
import { PredictionsNotAllowedError } from '../errors/predictions-not-allowed.error.ts';
import { AnsweredCountChangedEvent } from '../events/answered-count-changed.event.ts';
import { DilemmaRevealedEvent } from '../events/dilemma-revealed.event.ts';
import type { DomainEvent } from '../events/domain-event.ts';
import { ProgressUpdatedEvent } from '../events/progress-updated.event.ts';
import { RoundStartedEvent } from '../events/round-started.event.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import type { Randomness } from '../ports/randomness.port.ts';
import type { DilemmaOrigin } from '../services/compose-game.ts';
import { peopleInTheGap } from '../services/people-in-the-gap.ts';
import { shuffle } from '../services/random-choice.ts';
import { scorePredictions } from '../services/score-predictions.ts';
import { AnswerVO, type AnswerProps, type Seal, type VotePrediction } from '../vos/answer.vo.ts';
import { DilemmaVO } from '../vos/dilemma.vo.ts';
import type { GroupNature, Place } from '../vos/group.vo.ts';
import { IdVO } from '../vos/id.vo.ts';
import { VoteVO } from '../vos/vote.vo.ts';
import type {
  DilemmaLanguage,
  RoomVariant,
  TimePerDilemmaSeconds,
} from '../vos/room-settings.vo.ts';
import type { Player } from './player.ts';

/** A dilemma of the game: its id, the version played, the ids of its options and whether it has the gap. */
export interface GameDilemma {
  readonly dilemmaId: string;
  readonly version: number;
  readonly optionIds: readonly string[];
  readonly hasGap: boolean;
}

/** A dilemma as the game plays it: what the catalog gives, how it got into the game and who added it. */
export interface PlayedDilemma extends GameDilemma {
  readonly origin: DilemmaOrigin;
  /** The player who added it in the lobby; null for the others. */
  readonly addedBy: string | null;
}

/** What the game copies from its room when it starts, and keeps even if the room changes. */
export interface GameSettings {
  readonly variant: RoomVariant;
  readonly groupNature: GroupNature;
  readonly place: Place;
  readonly dilemmaLanguage: DilemmaLanguage;
  readonly timePerDilemmaSeconds: TimePerDilemmaSeconds;
}

/** Each round answers its dilemma in the decision phase, then shows it in the reveal. */
export type RoundPhase = 'decision' | 'reveal';

/** What revealed the dilemma of a round: everyone answered, its time ran out, or the host. */
export type RevealedBy = 'everyone' | 'time' | 'host';

/** The round in progress: one dilemma, played by everyone at the same time. */
export interface Round {
  /** The position of its dilemma in the game, from 0. */
  readonly position: number;
  readonly dilemmaId: string;
  readonly phase: RoundPhase;
  readonly startedAt: Date;
  /** When its time per dilemma runs out. */
  readonly endsAt: Date;
  /** Null until the dilemma is revealed. */
  readonly revealedBy: RevealedBy | null;
  /** Who moved on to this round from the reveal of the previous one; null for the first. */
  readonly movedOnBy: string | null;
}

/** Why a dilemma is recorded as "did not vote": unanswered when it was revealed, or skipped by reporting it. */
export type DidNotVoteReason = 'not-answered' | 'reported';

/** What a player answers of a dilemma, complete or not yet: the vote and the predictions made so far. */
export interface AnswerDraft {
  readonly vote: string;
  readonly votePredictions?: readonly VotePrediction[];
}

/** In an anonymous room, a dilemma voted by fewer players shows no distribution: it would give their votes away. */
export const MINIMUM_VOTES_TO_SHOW = 3;

/**
 * What the reveal of a dilemma shows. In an anonymous room only the distribution and the count of
 * who did not vote; the rest is empty.
 */
export interface DilemmaReveal {
  readonly position: number;
  readonly dilemmaId: string;
  /** How many chose each option, in the order of the dilemma; null when too few voted to show it. */
  readonly distribution: readonly { readonly optionId: string; readonly count: number }[] | null;
  readonly tooFewVotes: boolean;
  readonly didNotVoteCount: number;
  /** What each player voted, null for who did not vote. */
  readonly votes: readonly { readonly playerId: string; readonly vote: string | null }[];
  /** Each vote prediction made, and whether it was right. */
  readonly votePredictions: readonly {
    readonly playerId: string;
    readonly aboutId: string;
    readonly vote: string;
    readonly right: boolean;
  }[];
  readonly personInTheGap: string | null;
  readonly addedBy: string | null;
}

export interface GameSnapshot {
  readonly id: string;
  readonly roomId: string;
  readonly dilemmas: readonly PlayedDilemma[];
  readonly settings: GameSettings;
  readonly version: number;
  readonly round: Omit<Round, 'dilemmaId'> | null;
  readonly peopleInTheGap: readonly { readonly dilemmaId: string; readonly playerId: string }[];
  readonly players: readonly {
    readonly id: string;
    readonly left: boolean;
    /** The options of each dilemma in the order the player sees them. */
    readonly optionOrders: readonly {
      readonly dilemmaId: string;
      readonly optionOrder: readonly string[];
    }[];
    readonly answers: readonly ({ readonly dilemmaId: string } & AnswerProps)[];
    readonly didNotVote: readonly {
      readonly dilemmaId: string;
      readonly reason: DidNotVoteReason;
    }[];
    /** What the vote predictions of the player scored in each dilemma revealed; null for none made. */
    readonly points: readonly { readonly dilemmaId: string; readonly points: number | null }[];
    /** The dilemmas the player reported, and whether as offensive, which lets them skip it. */
    readonly reports: readonly { readonly dilemmaId: string; readonly offensive: boolean }[];
  }[];
}

interface PlayerState {
  readonly optionOrders: Map<string, readonly string[]>;
  readonly answers: Map<string, AnswerVO>;
  readonly didNotVote: Map<string, DidNotVoteReason>;
  readonly points: Map<string, number | null>;
  /** Whether each dilemma the player reported was offensive. */
  readonly reports: Map<string, boolean>;
  left: boolean;
}

interface RoundState {
  readonly position: number;
  phase: RoundPhase;
  readonly startedAt: Date;
  readonly endsAt: Date;
  revealedBy: RevealedBy | null;
  readonly movedOnBy: string | null;
}

const MS_PER_SECOND = 1000;

export class Game {
  readonly #id: IdVO;
  readonly #roomId: IdVO;
  readonly #dilemmas: readonly DilemmaVO[];
  readonly #origins: ReadonlyMap<
    string,
    { readonly origin: DilemmaOrigin; readonly addedBy: string | null }
  >;
  readonly #settings: GameSettings;
  #round: RoundState | null = null;
  /** Goes up with every change, so the clients can drop what is older than what they hold. */
  #version = 0;
  #peopleInTheGap = new Map<string, string>();
  /** In the order of the players of the game. */
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
    this.#origins = new Map(
      dilemmas.map(({ dilemmaId, origin, addedBy }) => [dilemmaId, { origin, addedBy }]),
    );
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
    return this.#dilemmas.map(({ dilemmaId, version, optionIds, hasGap }) => {
      const { origin, addedBy } = this.#origins.get(dilemmaId) as {
        origin: DilemmaOrigin;
        addedBy: string | null;
      };
      return { dilemmaId, version, optionIds, hasGap, origin, addedBy };
    });
  }

  get settings(): GameSettings {
    return { ...this.#settings };
  }

  get playerIds(): readonly string[] {
    return [...this.#players.keys()];
  }

  /** The round in progress; null before the game starts. */
  get round(): Round | null {
    if (!this.#round) return null;
    return {
      ...this.#round,
      dilemmaId: this.#roundDilemma().dilemmaId,
      startedAt: new Date(this.#round.startedAt),
      endsAt: new Date(this.#round.endsAt),
    };
  }

  /** The phase of the round in progress; null before the game starts. */
  get phase(): RoundPhase | null {
    return this.#round?.phase ?? null;
  }

  get isInDecisionPhase(): boolean {
    return this.#round?.phase === 'decision';
  }

  get version(): number {
    return this.#version;
  }

  /**
   * The game starts with its first round. Everyone gets the dilemmas in the same order; each player
   * gets the options of each dilemma in an order of their own; each dilemma with the gap gets its
   * person.
   */
  start(players: readonly Player[], at: Date, randomness: Randomness): void {
    if (this.#round !== null) throw new DecisionPhaseAlreadyStartedError();
    if (players.length === 0) throw new PlayersMissingError();

    const playerIds = players.map(({ id }) => id);
    for (const playerId of playerIds) {
      this.#players.set(playerId, {
        optionOrders: new Map(
          this.#dilemmas.map((dilemma) => [
            dilemma.dilemmaId,
            shuffle(dilemma.optionIds, randomness),
          ]),
        ),
        answers: new Map(),
        didNotVote: new Map(),
        points: new Map(),
        reports: new Map(),
        left: false,
      });
    }
    this.#peopleInTheGap = peopleInTheGap(
      this.#dilemmas.filter(({ hasGap }) => hasGap).map(({ dilemmaId }) => dilemmaId),
      playerIds,
      randomness,
    );
    this.#round = this.#roundAt(0, at, null);
    this.#version += 1;
  }

  /**
   * The player answers the dilemma of the round, or changes their answer, until it is revealed. A
   * complete answer is the vote in an anonymous room, and the vote with every prediction in a
   * nominal one; once complete, the player has answered the round. The seal is the one in force
   * now, also when the player changes an answer.
   */
  answer(playerId: string, dilemmaId: string, draft: AnswerDraft, seal: Seal, at: Date): void {
    const dilemma = this.#decisionDilemma(dilemmaId);
    const state = this.#activeStateOf(playerId);
    const vote = new VoteVO(draft.vote).value;
    if (state.didNotVote.has(dilemmaId)) throw new DilemmaSkippedError(dilemmaId);
    if (!dilemma.hasOption(vote)) throw new OptionNotInDilemmaError(vote, dilemmaId);
    const votePredictions = draft.votePredictions ?? [];
    this.#ensurePredictionsFit(dilemma, this.playersToPredictBy(playerId), votePredictions);

    const previous = state.answers.get(dilemmaId);
    const wasComplete = previous !== undefined && this.#isComplete(playerId, previous);
    let answer = new AnswerVO({
      vote,
      votePredictions,
      optionOrder: this.optionOrderOf(playerId, dilemmaId),
      responseTimeMs: previous?.responseTimeMs ?? null,
      seal,
      voterInTheGap: this.#peopleInTheGap.get(dilemmaId) === playerId,
    });
    const isComplete = this.#isComplete(playerId, answer);
    if (wasComplete && !isComplete) throw new AnswerIncompleteError(dilemmaId);

    if (isComplete && !wasComplete) {
      answer = answer.completedIn(at.getTime() - (this.#round as RoundState).startedAt.getTime());
    }
    state.answers.set(dilemmaId, answer);
    this.#version += 1;
    if (isComplete && !wasComplete) this.#afterAnswered(playerId);
  }

  /**
   * The player reported the dilemma of the round, once. Reported as offensive, they may skip it;
   * the report itself is for Moderation.
   */
  recordReport(playerId: string, dilemmaId: string, offensive: boolean): void {
    this.#decisionDilemma(dilemmaId);
    const state = this.#activeStateOf(playerId);
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
   * The player skips the dilemma of the round, which they reported as offensive: it is recorded as
   * "did not vote", for good, and the round does not wait for them.
   */
  skip(playerId: string, dilemmaId: string): void {
    this.#decisionDilemma(dilemmaId);
    const state = this.#activeStateOf(playerId);
    if (state.didNotVote.has(dilemmaId)) return;
    if (state.reports.get(dilemmaId) !== true) {
      throw new DilemmaNotReportedAsOffensiveError(dilemmaId);
    }

    const wasAnswered = this.hasAnswered(playerId);
    state.answers.delete(dilemmaId);
    state.didNotVote.set(dilemmaId, 'reported');
    this.#version += 1;
    if (!wasAnswered) this.#afterAnswered(playerId);
  }

  /**
   * Reveals the dilemma of the round once every player who is connected and has not left has
   * answered it. With nobody connected it waits for its time. Whether it revealed it.
   */
  revealIfEveryoneAnswered(connectedPlayerIds: readonly string[]): boolean {
    if (!this.isInDecisionPhase) return false;
    const connected = new Set(connectedPlayerIds);
    const present = this.#activePlayerIds().filter((playerId) => connected.has(playerId));
    if (present.length === 0 || !present.every((playerId) => this.hasAnswered(playerId))) {
      return false;
    }
    this.reveal('everyone');
    return true;
  }

  /**
   * Once the time for the dilemma of the round is over, reveals it. It does nothing before, nor
   * once revealed, so anyone may call it whenever they find the time over. Whether it revealed it.
   */
  runOutRound(at: Date): boolean {
    if (!this.#round || this.#round.phase !== 'decision') return false;
    if (at.getTime() < this.#round.endsAt.getTime()) return false;
    this.reveal('time');
    return true;
  }

  /**
   * The decision phase of the round ends: whoever has no vote for its dilemma is recorded as "did
   * not vote", nobody can answer it any more and, in a nominal room, the predictions made are
   * scored. Who may ask for it is up to the room.
   */
  reveal(by: RevealedBy): void {
    const { dilemmaId } = this.#decisionDilemma(this.#roundDilemma().dilemmaId);
    for (const state of this.#players.values()) {
      if (!state.answers.has(dilemmaId) && !state.didNotVote.has(dilemmaId)) {
        state.didNotVote.set(dilemmaId, 'not-answered');
      }
    }
    if (this.#settings.variant === 'nominal') this.#score(dilemmaId);
    const round = this.#round as RoundState;
    round.phase = 'reveal';
    round.revealedBy = by;
    this.#version += 1;
    this.#events.push(new DilemmaRevealedEvent(this.id, round.position, this.#version));
  }

  /**
   * From the reveal of the round at that position, the player takes everyone to the next round.
   * Asked from a round that is no longer in its reveal, it does nothing, so two players who move on
   * at once move one round. Whether it moved on.
   */
  moveOn(playerId: string, fromPosition: number, at: Date): boolean {
    this.#activeStateOf(playerId);
    const round = this.#round;
    if (!round || round.position !== fromPosition || round.phase !== 'reveal') return false;
    if (round.position === this.#dilemmas.length - 1) throw new NoNextRoundError();

    const next = this.#roundAt(round.position + 1, at, playerId);
    this.#round = next;
    this.#version += 1;
    this.#events.push(new RoundStartedEvent(this.id, next.position, playerId, this.#version));
    return true;
  }

  /** The player leaves on purpose: they keep their answers, and no round waits for them any more. */
  leave(playerId: string): void {
    const state = this.#stateOf(playerId);
    if (state.left) return;
    state.left = true;
    this.#version += 1;
  }

  /** A player who had left comes back to the game where it is. */
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

  /** Whether the player has completed or skipped the dilemma of the round. */
  hasAnswered(playerId: string): boolean {
    if (!this.#round) return false;
    const { dilemmaId } = this.#roundDilemma();
    return (
      this.#stateOf(playerId).didNotVote.get(dilemmaId) === 'reported' ||
      this.#isCompleted(playerId, dilemmaId)
    );
  }

  /** How many players still in the game have answered the dilemma of the round: all an anonymous room tells. */
  get answeredCount(): number {
    return this.#activePlayerIds().filter((playerId) => this.hasAnswered(playerId)).length;
  }

  /** The options of the dilemma in the order the player sees them. */
  optionOrderOf(playerId: string, dilemmaId: string): readonly string[] {
    this.#dilemmaOf(dilemmaId);
    return [...(this.#stateOf(playerId).optionOrders.get(dilemmaId) as readonly string[])];
  }

  /** The players whose vote the player predicts in each dilemma: all the others in a nominal room, none in an anonymous one. */
  playersToPredictBy(playerId: string): readonly string[] {
    this.#stateOf(playerId);
    if (this.#settings.variant === 'anonymous') return [];
    return this.playerIds.filter((other) => other !== playerId);
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

  /** What the vote predictions of the player scored in each dilemma revealed so far; null for none made. */
  pointsOf(
    playerId: string,
  ): readonly { readonly dilemmaId: string; readonly points: number | null }[] {
    const { points } = this.#stateOf(playerId);
    return this.#dilemmas.flatMap(({ dilemmaId }) =>
      points.has(dilemmaId) ? [{ dilemmaId, points: points.get(dilemmaId) ?? null }] : [],
    );
  }

  /** What the reveal of the dilemma at that position shows, once it has been revealed. */
  revealOf(position: number): DilemmaReveal {
    const round = this.#round;
    const revealed =
      round !== null &&
      (position < round.position || (position === round.position && round.phase === 'reveal'));
    const dilemma = this.#dilemmas[position];
    if (!revealed || !dilemma) throw new DilemmaNotRevealedError(position);

    const { dilemmaId } = dilemma;
    const nominal = this.#settings.variant === 'nominal';
    const answerOf = (playerId: string) => this.#stateOf(playerId).answers.get(dilemmaId);
    const voteOf = (playerId: string) => answerOf(playerId)?.vote ?? null;
    const voters = this.playerIds.filter((playerId) => voteOf(playerId) !== null);
    const tooFewVotes = !nominal && voters.length < MINIMUM_VOTES_TO_SHOW;

    return {
      position,
      dilemmaId,
      distribution: tooFewVotes
        ? null
        : dilemma.optionIds.map((optionId) => ({
            optionId,
            count: voters.filter((playerId) => voteOf(playerId) === optionId).length,
          })),
      tooFewVotes,
      didNotVoteCount: this.playerIds.length - voters.length,
      votes: nominal
        ? this.playerIds.map((playerId) => ({ playerId, vote: voteOf(playerId) }))
        : [],
      votePredictions: nominal
        ? voters.flatMap((playerId) =>
            (answerOf(playerId)?.votePredictions ?? []).map(({ playerId: aboutId, vote }) => ({
              playerId,
              aboutId,
              vote,
              right: voteOf(aboutId) === vote,
            })),
          )
        : [],
      personInTheGap: this.#peopleInTheGap.get(dilemmaId) ?? null,
      addedBy: nominal ? (this.#origins.get(dilemmaId)?.addedBy ?? null) : null,
    };
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
      version: this.#version,
      round: this.#round && {
        ...this.#round,
        startedAt: new Date(this.#round.startedAt),
        endsAt: new Date(this.#round.endsAt),
      },
      peopleInTheGap: [...this.#peopleInTheGap].map(([dilemmaId, playerId]) => ({
        dilemmaId,
        playerId,
      })),
      players: [...this.#players].map(([playerId, state]) => ({
        id: playerId,
        left: state.left,
        optionOrders: [...state.optionOrders].map(([dilemmaId, optionOrder]) => ({
          dilemmaId,
          optionOrder: [...optionOrder],
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
    game.#version = snapshot.version;
    game.#round = snapshot.round && {
      ...snapshot.round,
      startedAt: new Date(snapshot.round.startedAt),
      endsAt: new Date(snapshot.round.endsAt),
    };
    game.#peopleInTheGap = new Map(
      snapshot.peopleInTheGap.map(({ dilemmaId, playerId }) => [dilemmaId, playerId]),
    );
    for (const player of snapshot.players) {
      game.#players.set(player.id, {
        optionOrders: new Map(
          player.optionOrders.map(({ dilemmaId, optionOrder }) => [dilemmaId, [...optionOrder]]),
        ),
        answers: new Map(
          player.answers.map(({ dilemmaId, ...props }) => [dilemmaId, new AnswerVO(props)]),
        ),
        didNotVote: new Map(player.didNotVote.map(({ dilemmaId, reason }) => [dilemmaId, reason])),
        points: new Map(player.points.map(({ dilemmaId, points }) => [dilemmaId, points])),
        reports: new Map(player.reports.map(({ dilemmaId, offensive }) => [dilemmaId, offensive])),
        left: player.left,
      });
    }
    return game;
  }

  #roundAt(position: number, at: Date, movedOnBy: string | null): RoundState {
    return {
      position,
      phase: 'decision',
      startedAt: new Date(at),
      endsAt: new Date(at.getTime() + this.#settings.timePerDilemmaSeconds * MS_PER_SECOND),
      revealedBy: null,
      movedOnBy,
    };
  }

  #roundDilemma(): DilemmaVO {
    if (!this.#round) throw new DecisionPhaseNotStartedError();
    return this.#dilemmas[this.#round.position] as DilemmaVO;
  }

  /** The dilemma, which must be the one of the round, while the round is in its decision phase. */
  #decisionDilemma(dilemmaId: string): DilemmaVO {
    const dilemma = this.#dilemmaOf(dilemmaId);
    if (!this.#round) throw new DecisionPhaseNotStartedError();
    if (dilemma !== this.#roundDilemma()) throw new DilemmaNotInRoundError(dilemmaId);
    if (this.#round.phase === 'reveal') throw new DecisionPhaseOverError();
    return dilemma;
  }

  /** A player who left plays nothing until they come back. */
  #activeStateOf(playerId: string): PlayerState {
    const state = this.#stateOf(playerId);
    if (state.left) throw new PlayerLeftGameError(playerId);
    return state;
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

  #isCompleted(playerId: string, dilemmaId: string): boolean {
    const answer = this.#stateOf(playerId).answers.get(dilemmaId);
    return answer !== undefined && this.#isComplete(playerId, answer);
  }

  /** The vote in an anonymous room; the vote with every prediction in a nominal one. */
  #isComplete(playerId: string, answer: AnswerVO): boolean {
    if (this.#settings.variant === 'anonymous') return true;
    const predicted = new Set(answer.votePredictions.map((prediction) => prediction.playerId));
    return this.playersToPredictBy(playerId).every((other) => predicted.has(other));
  }

  #ensurePredictionsFit(
    dilemma: DilemmaVO,
    playersToPredict: readonly string[],
    votePredictions: readonly VotePrediction[],
  ): void {
    if (this.#settings.variant === 'anonymous') {
      if (votePredictions.length > 0) throw new PredictionsNotAllowedError();
      return;
    }
    const seen = new Set<string>();
    for (const { playerId, vote } of votePredictions) {
      if (!playersToPredict.includes(playerId)) throw new PlayerNotPredictableError(playerId);
      if (seen.has(playerId)) throw new DuplicateVotePredictionError(playerId);
      seen.add(playerId);
      if (!dilemma.hasOption(vote.trim())) {
        throw new OptionNotInDilemmaError(vote, dilemma.dilemmaId);
      }
    }
  }

  /** In a nominal room the others learn who answered; in an anonymous one, only how many. */
  #afterAnswered(playerId: string): void {
    if (this.#settings.variant === 'anonymous') {
      this.#events.push(new AnsweredCountChangedEvent(this.id, this.answeredCount, this.#version));
      return;
    }
    this.#events.push(
      new ProgressUpdatedEvent(this.id, playerId, this.progressOf(playerId), this.#version),
    );
  }

  #activePlayerIds(): string[] {
    return [...this.#players].filter(([, state]) => !state.left).map(([playerId]) => playerId);
  }

  #score(dilemmaId: string): void {
    const points = scorePredictions({
      playerIds: this.playerIds,
      answerOf: (playerId) => this.#stateOf(playerId).answers.get(dilemmaId),
    });
    for (const [playerId, scored] of points) {
      this.#stateOf(playerId).points.set(dilemmaId, scored);
    }
  }
}
