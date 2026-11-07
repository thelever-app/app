import type { Room } from '../../domain/entities/room.ts';
import type { DomainEvent } from '../../domain/events/domain-event.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';

/**
 * Tells everyone in the room what changed in it. What changed is already saved: a player who
 * cannot be reached must not undo it.
 */
export async function notifyRoom(
  room: Room,
  events: readonly DomainEvent[],
  notifier: PlayerNotifier,
): Promise<void> {
  const playerIds = room.players.map(({ id }) => id);
  await Promise.allSettled(events.map((event) => notifier.notify(playerIds, event)));
}
