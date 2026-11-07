import type { Game } from '../entities/game.ts';
import type { Room } from '../entities/room.ts';

/**
 * During the decision phase, a disconnected host loses the role when the game needs one: once
 * the total time has run out, or once everyone else has finished. Whoever takes it can start
 * the reveal; the host gets it back on connecting again.
 */
export function handOverHostIfAway(room: Room, game: Game): void {
  if (!game.isInDecisionPhase) return;
  const hostId = room.host.id;
  if (room.isConnected(hostId)) return;
  if (game.totalTimeRanOut || game.everyoneElseFinished(hostId)) room.handOverHost();
}
