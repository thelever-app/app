import type { Room } from '../../domain/entities/room.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';
import type { RoomRepository } from '../ports/room-repository.port.ts';

/**
 * The player is out of the room in the lobby: their connections close and the others hear it. The
 * last one out closes the room.
 */
export async function leaveLobby(
  room: Room,
  playerId: string,
  at: Date,
  ports: { readonly roomRepository: RoomRepository; readonly notifier: PlayerNotifier },
): Promise<void> {
  const playerIds = room.players.map(({ id }) => id);
  room.leave(playerId, [], at);
  const events = room.pullEvents();
  await ports.roomRepository.save(room);
  await Promise.allSettled(events.map((event) => ports.notifier.notify(playerIds, event)));
}
