import type { Game } from '../entities/game.ts';
import type { Room } from '../entities/room.ts';

/**
 * The game knows who is ready to move on and who left; the room, who is connected. Once every
 * connected player who has not left is ready, everyone moves on.
 */
export function moveOnIfEveryoneIsReady(room: Room, game: Game, at: Date): void {
  game.moveOnIfEveryoneIsReady(room.connectedPlayerIds, at);
}
