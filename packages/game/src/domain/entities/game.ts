import { DecisionPhaseNotStartedError } from '../errors/decision-phase-not-started.error.ts';
import { DilemmaNotInGameError } from '../errors/dilemma-not-in-game.error.ts';
import { DilemmasMissingError } from '../errors/dilemmas-missing.error.ts';
import { PlayerNotInGameError } from '../errors/player-not-in-game.error.ts';
import type { DomainEvent } from '../events/domain-event.ts';
import { ProgressUpdatedEvent } from '../events/progress-updated.event.ts';
import { IdVO } from '../vos/id.vo.ts';
import { AnswerVO } from '../vos/answer.vo.ts';
import { Player } from './player.ts';

export class Game {
  readonly #id: IdVO;
  readonly #roomId: IdVO;
  readonly #dilemmas: IdVO[];
  #inDecisionPhase = false;
  readonly #answers = new Map<string, Map<string, AnswerVO>>();
  #events: DomainEvent[] = [];

  constructor(id: string, roomId: string, dilemmas: string[]) {
    if (dilemmas.length === 0) throw new DilemmasMissingError();

    this.#id = new IdVO(id);
    this.#roomId = new IdVO(roomId);
    this.#dilemmas = dilemmas.map((dilemma) => new IdVO(dilemma));
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

  get isInDecisionPhase(): boolean {
    return this.#inDecisionPhase;
  }

  startDecisionPhase(players: readonly Player[]): void {
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

  #answersOf(playerId: string): Map<string, AnswerVO> {
    const answers = this.#answers.get(playerId);
    if (!answers) throw new PlayerNotInGameError(playerId);
    return answers;
  }
}
