import type { Game } from '../../domain/entities/game.ts';
import type { Room } from '../../domain/entities/room.ts';
import { DecisionPhaseOverError } from '../../domain/errors/decision-phase-over.error.ts';
import { handOverHostIfAway } from '../../domain/services/host-handover.ts';
import type { GameRepository } from '../ports/game-repository.port.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';
import { notifyGame } from './notify-game.ts';

/**
 * A command for the dilemma of the round that comes once its time is over finds it over: the
 * dilemma is revealed, saved and told to everyone, as the timer would have done, and the command
 * is rejected because its decision phase is over.
 */
export async function runOutRoundFirst(
  { room, game }: { readonly room: Room; readonly game: Game },
  ports: {
    readonly roomRepository: RoomRepository;
    readonly gameRepository: GameRepository;
    readonly notifier: PlayerNotifier;
  },
  at: Date,
): Promise<void> {
  if (!game.runOutRound(at)) return;

  handOverHostIfAway(room, game);
  const gameEvents = game.pullEvents();
  const roomEvents = room.pullEvents();
  await ports.gameRepository.save(game);
  if (roomEvents.length > 0) await ports.roomRepository.save(room);
  await notifyGame({ room, game }, { roomEvents, gameEvents }, ports.notifier);
  throw new DecisionPhaseOverError();
}
