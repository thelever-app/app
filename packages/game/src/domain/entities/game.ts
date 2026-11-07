import { DecisionPhaseAlreadyStartedError } from '../errors/decision-phase-already-started.error.ts';
import { DecisionPhaseNotStartedError } from '../errors/decision-phase-not-started.error.ts';
import { DilemmaNotInGameError } from '../errors/dilemma-not-in-game.error.ts';
import { DilemmaNotReachedError } from '../errors/dilemma-not-reached.error.ts';
import { DilemmasMissingError } from '../errors/dilemmas-missing.error.ts';
import { DuplicateDilemmaError } from '../errors/duplicate-dilemma.error.ts';
import { OptionNotInDilemmaError } from '../errors/option-not-in-dilemma.error.ts';
import { PlayerNotInGameError } from '../errors/player-not-in-game.error.ts';
import { PlayersMissingError } from '../errors/players-missing.error.ts';
import type { DomainEvent } from '../events/domain-event.ts';
import { ProgressUpdatedEvent } from '../events/progress-updated.event.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import { IdVO } from '../vos/id.vo.ts';
import { AnswerVO, type Seal } from '../vos/answer.vo.ts';
import { DilemmaVO } from '../vos/dilemma.vo.ts';
import type { DilemmaOrigin } from '../services/compose-game.ts';
import type { GroupNature, Place } from '../vos/group.vo.ts';
import type { DilemmaLanguage, RoomVariant, TotalTimeInMinutes } from '../vos/room-settings.vo.ts';
import { Player } from './player.ts';

/** A dilemma of the game: its id, the version played and the ids of its options. */
export interface GameDilemma {
  readonly dilemmaId: string;
  readonly version: number;
  readonly optionIds: readonly string[];
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

export interface GameSnapshot {
  readonly id: string;
  readonly roomId: string;
  readonly dilemmas: readonly PlayedDilemma[];
  readonly settings: GameSettings;
  readonly inDecisionPhase: boolean;
  readonly version: number;
  readonly players: readonly {
    readonly id: string;
    readonly answers: readonly {
      readonly dilemmaId: string;
      readonly vote: string;
      readonly seal: Seal;
      readonly voterInTheGap: boolean;
    }[];
  }[];
}

export class Game {
  readonly #id: IdVO;
  readonly #roomId: IdVO;
  readonly #dilemmas: readonly DilemmaVO[];
  readonly #origins: ReadonlyMap<string, DilemmaOrigin>;
  readonly #settings: GameSettings;
  #inDecisionPhase = false;
  /** Goes up with every change, so the clients can drop what is older than what they hold. */
  #version = 0;
  readonly #answers = new Map<string, Map<string, AnswerVO>>();
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
      ({ dilemmaId, version, optionIds }) => new DilemmaVO(dilemmaId, version, optionIds),
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
    return this.#dilemmas.map(({ dilemmaId, version, optionIds }) => ({
      dilemmaId,
      version,
      optionIds,
      origin: this.#origins.get(dilemmaId) as DilemmaOrigin,
    }));
  }

  get settings(): GameSettings {
    return { ...this.#settings };
  }

  get playerIds(): readonly string[] {
    return [...this.#answers.keys()];
  }

  get isInDecisionPhase(): boolean {
    return this.#inDecisionPhase;
  }

  get version(): number {
    return this.#version;
  }

  startDecisionPhase(players: readonly Player[]): void {
    if (this.#inDecisionPhase) throw new DecisionPhaseAlreadyStartedError();
    if (players.length === 0) throw new PlayersMissingError();

    for (const player of players) {
      this.#answers.set(player.id, new Map());
    }
    this.#inDecisionPhase = true;
    this.#version += 1;
  }

  /** The seal is the one in force now, also when the player changes an answer. */
  answer(playerId: string, dilemmaId: string, vote: string, seal: Seal): void {
    if (!this.#inDecisionPhase) throw new DecisionPhaseNotStartedError();
    const answers = this.#answersOf(playerId);
    const dilemma = this.#dilemmas.find((candidate) => candidate.dilemmaId === dilemmaId);
    if (!dilemma) throw new DilemmaNotInGameError(dilemmaId);
    if (!dilemma.hasOption(vote)) throw new OptionNotInDilemmaError(vote, dilemmaId);
    // Dilemmas are answered in order: the next one, or one already answered to change it.
    const next = this.#dilemmas.find((candidate) => !answers.has(candidate.dilemmaId));
    if (!answers.has(dilemmaId) && dilemma !== next) throw new DilemmaNotReachedError(dilemmaId);

    const progressBefore = answers.size;
    // No dilemma has the gap "someone in the group" yet, so the voter is never the person in it.
    answers.set(dilemmaId, new AnswerVO(vote, seal, false));
    this.#version += 1;

    if (answers.size > progressBefore) {
      this.#events.push(new ProgressUpdatedEvent(this.id, playerId, answers.size, this.#version));
    }
  }

  progressOf(playerId: string): number {
    return this.#answersOf(playerId).size;
  }

  /** The answers of one player, in the order of the dilemmas. Who may see them is up to the caller. */
  answersOf(playerId: string): readonly { readonly dilemmaId: string; readonly vote: string }[] {
    const answers = this.#answersOf(playerId);
    return this.#dilemmas.flatMap(({ dilemmaId }) => {
      const answer = answers.get(dilemmaId);
      return answer ? [{ dilemmaId, vote: answer.vote }] : [];
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
      inDecisionPhase: this.#inDecisionPhase,
      version: this.#version,
      players: [...this.#answers].map(([playerId, answers]) => ({
        id: playerId,
        answers: [...answers].map(([dilemmaId, answer]) => ({
          dilemmaId,
          vote: answer.vote,
          seal: answer.seal,
          voterInTheGap: answer.voterInTheGap,
        })),
      })),
    };
  }

  static restore(snapshot: GameSnapshot): Game {
    const game = new Game(snapshot.id, snapshot.roomId, snapshot.dilemmas, snapshot.settings);
    game.#inDecisionPhase = snapshot.inDecisionPhase;
    game.#version = snapshot.version;
    for (const player of snapshot.players) {
      const answers = player.answers.map(
        ({ dilemmaId, vote, seal, voterInTheGap }) =>
          [dilemmaId, new AnswerVO(vote, seal, voterInTheGap)] as const,
      );
      game.#answers.set(player.id, new Map(answers));
    }
    return game;
  }

  #answersOf(playerId: string): Map<string, AnswerVO> {
    const answers = this.#answers.get(playerId);
    if (!answers) throw new PlayerNotInGameError(playerId);
    return answers;
  }
}
