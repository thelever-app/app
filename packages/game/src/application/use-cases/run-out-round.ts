import type { Game } from '../../domain/entities/game.ts';
import type { Room } from '../../domain/entities/room.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { notifyGame } from './notify-game.ts';

/**
 * Once the time for the dilemma of the round is over, reveals it, saves it and tells everyone,
 * and an away host loses the role; whether it did. A command for that dilemma that comes after
 * its time finds it so, as the timer would have left it, and does nothing else.
 */
export async function runOutRound(
  { room, game }: { readonly room: Room; readonly game: Game },
  ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly notifier: PlayerNotifier;
  },
  at: Date,
): Promise<boolean> {
  if (!game.runOutRound(at)) return false;

  handOverHostIfAway(room, game);
  const gameEvents = game.pullEvents();
  const roomEvents = room.pullEvents();
  await ports.gameRepository.save(game);
  if (roomEvents.length > 0) await ports.roomRepository.save(room);
  await notifyGame({ room, game }, { roomEvents, gameEvents }, ports.notifier);
  return true;
}
