import type { GameStage } from '../entities/game.ts';
import type { DomainEvent } from './domain-event.ts';

/** Sent to everyone when a player moves on from the last round to the game results, or from them to the end. */
export class GameStageChangedEvent implements DomainEvent {
  readonly type = 'GameStageChanged';
  readonly gameId: string;
  readonly stage: GameStage;
  readonly movedOnBy: string;
  readonly gameVersion: number;

  constructor(gameId: string, stage: GameStage, movedOnBy: string, gameVersion: number) {
    this.gameId = gameId;
    this.stage = stage;
    this.movedOnBy = movedOnBy;
    this.gameVersion = gameVersion;
  }
}
