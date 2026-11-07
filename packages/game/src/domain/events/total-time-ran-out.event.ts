import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone when the total time of the decision phase runs out; the game goes on. */
export class TotalTimeRanOutEvent implements DomainEvent {
  readonly type = 'TotalTimeRanOut';
  readonly gameId: string;
  /** Who had not finished, and can keep answering. */
  readonly stragglerIds: readonly string[];
  readonly gameVersion: number;

  constructor(gameId: string, stragglerIds: readonly string[], gameVersion: number) {
    this.gameId = gameId;
    this.stragglerIds = [...stragglerIds];
    this.gameVersion = gameVersion;
  }
}
