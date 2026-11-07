import {
  type GetGameStateUseCase,
  type GetRoomStateUseCase,
  PlayerNotInGameError,
  PlayerNotInRoomError,
} from '@thelever-app/game';
import type { RoomConnection, Session } from './room-connection.ts';

/** Whether the player is still in the room, once told what they see. */
export type Delivered = 'sent' | 'expelled';

/**
 * Sends a player what they may see now: the game in progress in their room, or the lobby while
 * there is none or they do not play it. A player who is no longer in the room is told they were
 * expelled, and their connection forgets them.
 */
export class StateSender {
  readonly #getRoomState: GetRoomStateUseCase;
  readonly #getGameState: GetGameStateUseCase;

  constructor(getRoomState: GetRoomStateUseCase, getGameState: GetGameStateUseCase) {
    this.#getRoomState = getRoomState;
    this.#getGameState = getGameState;
  }

  async send(connection: RoomConnection, session: Session): Promise<Delivered> {
    const { roomId, playerId, language } = session;
    let room;
    try {
      room = await this.#getRoomState.execute({ roomId, playerId });
    } catch (error) {
      if (!(error instanceof PlayerNotInRoomError)) throw error;
      connection.session = undefined;
      connection.send({ type: 'expelled' });
      return 'expelled';
    }

    if (room.currentGameId) {
      try {
        const game = await this.#getGameState.execute({
          gameId: room.currentGameId,
          playerId,
          language,
        });
        connection.send({ type: 'game-state', ...game });
        return 'sent';
      } catch (error) {
        // Who joins once the game started waits in the lobby: that game is not theirs.
        if (!(error instanceof PlayerNotInGameError)) throw error;
      }
    }
    connection.send({ type: 'room-state', ...room });
    return 'sent';
  }
}
