import type { GameStage } from '../entities/game.ts';
import type { DomainEvent } from './domain-event.ts';

/**
 * Sent to everyone when the group moves on from the last round to the game results, or from them to
 * the end: once everyone is ready, or when the host moves everyone on.
 */
export class GameStageChangedEvent implements DomainEvent {
  readonly type = 'GameStageChanged';
  readonly gameId: string;
  readonly stage: GameStage;
  /** The host who moved everyone on; null when everyone was ready. */
  readonly movedOnBy: string | null;
  readonly gameVersion: number;

  constructor(gameId: string, stage: GameStage, movedOnBy: string | null, gameVersion: number) {
    this.gameId = gameId;
    this.stage = stage;
    this.movedOnBy = movedOnBy;
    this.gameVersion = gameVersion;
  }
}
