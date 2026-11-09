import type { Game } from '../entities/game.ts';
import type { Room } from '../entities/room.ts';

/**
 * A host still disconnected when the dilemma of a round is revealed loses the role, so the next
 * round has a host who can reveal it early. Whoever takes it is the connected player of the game
 * who has been in the room longest; the host gets it back on connecting again.
 */
export function handOverHostIfAway(room: Room, game: Game): void {
  if (game.phase !== 'reveal') return;
  if (room.isConnected(room.host.id)) return;
  room.handOverHost(game.playerIds);
}
