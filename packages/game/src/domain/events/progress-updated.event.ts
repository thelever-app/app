import type { DomainEvent } from './domain-event.ts';

/**
 * Sent to the other players when a player answers a dilemma.
 * It carries who moved on and their new progress, never their answer.
 */
export class ProgressUpdatedEvent implements DomainEvent {
  readonly type = 'ProgressUpdated';
  readonly gameId: string;
  readonly playerId: string;
  readonly progress: number;
  /** The version of the game after this answer, so the clients can order what they receive. */
  readonly gameVersion: number;

  constructor(gameId: string, playerId: string, progress: number, gameVersion: number) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.progress = progress;
    this.gameVersion = gameVersion;
  }
}
