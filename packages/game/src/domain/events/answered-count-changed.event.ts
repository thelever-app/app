import type { DomainEvent } from './domain-event.ts';

/**
 * Sent to everyone in an anonymous room when one more player answers the dilemma of the round.
 * It carries how many have answered, never who.
 */
export class AnsweredCountChangedEvent implements DomainEvent {
  readonly type = 'AnsweredCountChanged';
  readonly gameId: string;
  readonly answeredCount: number;
  readonly gameVersion: number;

  constructor(gameId: string, answeredCount: number, gameVersion: number) {
    this.gameId = gameId;
    this.answeredCount = answeredCount;
    this.gameVersion = gameVersion;
  }
}
