import type { Game } from '../entities/game.ts';
import type { Room } from '../entities/room.ts';

/**
 * The game knows who answered and who left; the room, who is connected. Once every connected
 * player who has not left has answered the dilemma of the round, it is revealed.
 */
export function revealIfEveryoneAnswered(room: Room, game: Game): void {
  game.revealIfEveryoneAnswered(room.connectedPlayerIds);
}
