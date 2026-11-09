import type { Game } from '../../domain/entities/game.ts';
import type { Room } from '../../domain/entities/room.ts';
import type { DomainEvent } from '../../domain/events/domain-event.ts';
import { ProgressUpdatedEvent } from '../../domain/events/progress-updated.event.ts';
import type { PlayerNotifier } from '../ports/player-notifier.port.ts';

/**
 * Tells the players what changed in the game and in its room: the progress of a player to the
 * others, and anything else to everyone. What changed is already saved: a player who cannot be
 * reached must not undo it.
 */
export async function notifyGame(
  { room, game }: { readonly room: Room; readonly game: Game },
  {
    roomEvents,
    gameEvents,
  }: { readonly roomEvents: readonly DomainEvent[]; readonly gameEvents: readonly DomainEvent[] },
  notifier: PlayerNotifier,
  ...excluded: readonly string[]
): Promise<void> {
  const inRoom = room.players.map(({ id }) => id).filter((id) => !excluded.includes(id));
  const inGame = game.playerIds;
  await Promise.allSettled([
    ...roomEvents.map((event) => notifier.notify(inRoom, event)),
    ...gameEvents.map((event) =>
      notifier.notify(
        event instanceof ProgressUpdatedEvent
          ? inGame.filter((id) => id !== event.playerId)
          : inGame,
        event,
      ),
    ),
  ]);
}
