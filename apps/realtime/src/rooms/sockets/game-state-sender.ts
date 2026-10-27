import type { GetGameStateUseCase } from '@thelever-app/game';
import type { RoomConnection, Session } from './room-connection.ts';

/** Sends a player the game as they may see it now. */
export class GameStateSender {
  readonly #getGameState: GetGameStateUseCase;

  constructor(getGameState: GetGameStateUseCase) {
    this.#getGameState = getGameState;
  }

  async send(connection: RoomConnection, { gameId, playerId, language }: Session): Promise<void> {
    const state = await this.#getGameState.execute({ gameId, playerId, language });
    connection.send({ type: 'game-state', ...state });
  }
}
