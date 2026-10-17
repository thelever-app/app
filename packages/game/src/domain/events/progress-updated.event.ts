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

  constructor(gameId: string, playerId: string, progress: number) {
    this.gameId = gameId;
    this.playerId = playerId;
    this.progress = progress;
  }
}
