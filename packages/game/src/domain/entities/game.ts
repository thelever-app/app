import { DecisionPhaseAlreadyStartedError } from '../errors/decision-phase-already-started.error.ts';
import { DecisionPhaseNotStartedError } from '../errors/decision-phase-not-started.error.ts';
import { DilemmaNotInGameError } from '../errors/dilemma-not-in-game.error.ts';
import { DilemmasMissingError } from '../errors/dilemmas-missing.error.ts';
import { DuplicateDilemmaError } from '../errors/duplicate-dilemma.error.ts';
import { PlayerNotInGameError } from '../errors/player-not-in-game.error.ts';
import { PlayersMissingError } from '../errors/players-missing.error.ts';
import type { DomainEvent } from '../events/domain-event.ts';
import { ProgressUpdatedEvent } from '../events/progress-updated.event.ts';
import type { IdGenerator } from '../ports/id-generator.port.ts';
import { IdVO } from '../vos/id.vo.ts';
import { AnswerVO } from '../vos/answer.vo.ts';
import { Player } from './player.ts';

export interface GameSnapshot {
  readonly id: string;
  readonly roomId: string;
  readonly dilemmas: readonly string[];
  readonly inDecisionPhase: boolean;
  readonly players: readonly {
    readonly id: string;
    readonly answers: readonly { readonly dilemmaId: string; readonly vote: string }[];
  }[];
}

export class Game {
  readonly #id: IdVO;
  readonly #roomId: IdVO;
  readonly #dilemmas: IdVO[];
  #inDecisionPhase = false;
  readonly #answers = new Map<string, Map<string, AnswerVO>>();
  #events: DomainEvent[] = [];

  private constructor(id: string, roomId: string, dilemmas: readonly string[]) {
    if (dilemmas.length === 0) throw new DilemmasMissingError();
    const repeated = dilemmas.find((dilemma, index) => dilemmas.indexOf(dilemma) !== index);
    if (repeated !== undefined) throw new DuplicateDilemmaError(repeated);

    this.#id = new IdVO(id);
    this.#roomId = new IdVO(roomId);
    this.#dilemmas = dilemmas.map((dilemma) => new IdVO(dilemma));
  }

  static create(
    { roomId, dilemmaIds }: { readonly roomId: string; readonly dilemmaIds: readonly string[] },
    idGenerator: IdGenerator,
  ): Game {
    return new Game(idGenerator.generate(), roomId, dilemmaIds);
  }

  get id(): string {
    return this.#id.value;
  }

  get roomId(): string {
    return this.#roomId.value;
  }

  get dilemmas(): readonly string[] {
    return this.#dilemmas.map((dilemma) => dilemma.value);
  }

  get playerIds(): readonly string[] {
    return [...this.#answers.keys()];
  }

  get isInDecisionPhase(): boolean {
    return this.#inDecisionPhase;
  }

  startDecisionPhase(players: readonly Player[]): void {
    if (this.#inDecisionPhase) throw new DecisionPhaseAlreadyStartedError();
    if (players.length === 0) throw new PlayersMissingError();

    for (const player of players) {
      this.#answers.set(player.id, new Map());
    }
    this.#inDecisionPhase = true;
  }

  answer(playerId: string, dilemmaId: string, vote: string): void {
    if (!this.#inDecisionPhase) throw new DecisionPhaseNotStartedError();
    const answers = this.#answersOf(playerId);
    if (!this.dilemmas.includes(dilemmaId)) throw new DilemmaNotInGameError(dilemmaId);

    const progressBefore = answers.size;
    answers.set(dilemmaId, new AnswerVO(vote));

    if (answers.size > progressBefore) {
      this.#events.push(new ProgressUpdatedEvent(this.id, playerId, answers.size));
    }
  }

  progressOf(playerId: string): number {
    return this.#answersOf(playerId).size;
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
      inDecisionPhase: this.#inDecisionPhase,
      players: [...this.#answers].map(([playerId, answers]) => ({
        id: playerId,
        answers: [...answers].map(([dilemmaId, answer]) => ({ dilemmaId, vote: answer.vote })),
      })),
    };
  }

  static restore(snapshot: GameSnapshot): Game {
    const game = new Game(snapshot.id, snapshot.roomId, snapshot.dilemmas);
    game.#inDecisionPhase = snapshot.inDecisionPhase;
    for (const player of snapshot.players) {
      const answers = player.answers.map(
        ({ dilemmaId, vote }) => [dilemmaId, new AnswerVO(vote)] as const,
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
